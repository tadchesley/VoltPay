"""Shared business logic helpers used by both dashboard and public API routes."""
import secrets
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException

from db import get_db
from models import (
    PaymentIntentCreate, PaymentIntentConfirm, RefundCreate, PaymentMethodCreate,
)
from payment_engine import tokenize_card, authorize_charge, calculate_fee


async def create_payment_intent(merchant_id: str, payload: PaymentIntentCreate) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    client_secret = f"pi_secret_{secrets.token_urlsafe(20).replace('-', '').replace('_', '')[:30]}"
    doc = {
        "merchant_id": merchant_id,
        "amount": payload.amount,
        "amount_received": 0,
        "currency": payload.currency.lower(),
        "status": "requires_payment_method",
        "customer_id": payload.customer_id,
        "description": payload.description,
        "metadata": payload.metadata,
        "receipt_email": payload.receipt_email,
        "capture_method": payload.capture_method,
        "client_secret": client_secret,
        "created_at": now,
        "object": "payment_intent",
        "payment_method": None,
        "latest_charge_id": None,
    }
    result = await db.payment_intents.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


async def confirm_payment_intent(merchant_id: str, pi_id: str, payload: PaymentIntentConfirm) -> dict:
    db = get_db()
    pi = await db.payment_intents.find_one({"_id": ObjectId(pi_id), "merchant_id": merchant_id})
    if not pi:
        raise HTTPException(404, "Payment intent not found")
    if pi["status"] not in ("requires_payment_method", "requires_confirmation"):
        raise HTTPException(400, f"Cannot confirm intent with status '{pi['status']}'")

    # Get card token
    if payload.payment_method and payload.payment_method.card:
        try:
            card = payload.payment_method.card
            token = tokenize_card(card.number, card.exp_month, card.exp_year, card.cvc)
        except ValueError as e:
            await db.payment_intents.update_one(
                {"_id": pi["_id"]},
                {"$set": {"status": "requires_payment_method", "last_payment_error": {"code": "invalid_card", "message": str(e)}}},
            )
            raise HTTPException(400, str(e))
    else:
        raise HTTPException(400, "payment_method.card is required")

    # Authorize
    outcome = authorize_charge(pi["amount"], token)
    fee = calculate_fee(pi["amount"]) if outcome["status"] == "succeeded" else 0
    net = pi["amount"] - fee if outcome["status"] == "succeeded" else 0
    now = datetime.now(timezone.utc).isoformat()

    charge_doc = {
        "merchant_id": merchant_id,
        "payment_intent_id": pi_id,
        "amount": pi["amount"],
        "amount_refunded": 0,
        "currency": pi["currency"],
        "status": outcome["status"],
        "card_brand": token["brand"],
        "card_last4": token["last4"],
        "card_exp_month": token["exp_month"],
        "card_exp_year": token["exp_year"],
        "payment_method_token": token["token"],
        "customer_id": pi.get("customer_id"),
        "fee": fee,
        "net": net,
        "failure_code": outcome.get("failure_code"),
        "failure_message": outcome.get("failure_message"),
        "authorization_code": outcome.get("authorization_code"),
        "description": pi.get("description"),
        "receipt_email": pi.get("receipt_email"),
        "metadata": pi.get("metadata", {}),
        "created_at": now,
        "object": "charge",
    }
    charge_result = await db.charges.insert_one(charge_doc)
    charge_id = str(charge_result.inserted_id)

    new_pi_status = "succeeded" if outcome["status"] == "succeeded" else "requires_payment_method"
    update = {
        "status": new_pi_status,
        "latest_charge_id": charge_id,
        "payment_method": {
            "type": "card",
            "card": {"brand": token["brand"], "last4": token["last4"], "exp_month": token["exp_month"], "exp_year": token["exp_year"]},
        },
        "confirmed_at": now,
    }
    if outcome["status"] == "succeeded":
        update["amount_received"] = pi["amount"]
    else:
        update["last_payment_error"] = {
            "code": outcome.get("failure_code"),
            "message": outcome.get("failure_message"),
        }

    await db.payment_intents.update_one({"_id": pi["_id"]}, {"$set": update})

    # Update merchant balance + ledger on success
    if outcome["status"] == "succeeded":
        await db.users.update_one(
            {"_id": ObjectId(merchant_id)},
            {"$inc": {"balance_cents": net}},
        )
        await db.ledger_entries.insert_one({
            "merchant_id": merchant_id,
            "type": "charge",
            "amount": net,
            "gross": pi["amount"],
            "fee": fee,
            "currency": pi["currency"],
            "ref_id": charge_id,
            "ref_type": "charge",
            "description": f"Payment via {token['brand']} •••• {token['last4']}",
            "created_at": now,
        })
        await _enqueue_webhook(merchant_id, "payment_intent.succeeded", {**pi, **update, "id": pi_id})
        await _enqueue_webhook(merchant_id, "charge.succeeded", {**charge_doc, "id": charge_id})
    else:
        await _enqueue_webhook(merchant_id, "payment_intent.payment_failed", {**pi, **update, "id": pi_id})
        await _enqueue_webhook(merchant_id, "charge.failed", {**charge_doc, "id": charge_id})

    # Return updated payment intent
    pi_updated = await db.payment_intents.find_one({"_id": ObjectId(pi_id)})
    pi_updated["id"] = str(pi_updated.pop("_id"))
    return pi_updated


async def process_refund(merchant_id: str, payload: RefundCreate) -> dict:
    db = get_db()
    charge = None
    if payload.charge_id:
        charge = await db.charges.find_one({"_id": ObjectId(payload.charge_id), "merchant_id": merchant_id})
    elif payload.payment_intent_id:
        pi = await db.payment_intents.find_one({"_id": ObjectId(payload.payment_intent_id), "merchant_id": merchant_id})
        if pi and pi.get("latest_charge_id"):
            charge = await db.charges.find_one({"_id": ObjectId(pi["latest_charge_id"])})
    if not charge:
        raise HTTPException(404, "Charge not found")
    if charge["status"] != "succeeded" and charge["status"] != "partially_refunded":
        raise HTTPException(400, f"Cannot refund charge with status '{charge['status']}'")

    available = charge["amount"] - charge.get("amount_refunded", 0)
    amount = payload.amount or available
    if amount > available:
        raise HTTPException(400, f"Refund amount exceeds available {available}")

    now = datetime.now(timezone.utc).isoformat()
    refund_doc = {
        "merchant_id": merchant_id,
        "charge_id": str(charge["_id"]),
        "payment_intent_id": charge["payment_intent_id"],
        "amount": amount,
        "currency": charge["currency"],
        "reason": payload.reason or "requested_by_customer",
        "status": "succeeded",
        "created_at": now,
        "object": "refund",
    }
    result = await db.refunds.insert_one(refund_doc)
    refund_id = str(result.inserted_id)

    new_refunded = charge.get("amount_refunded", 0) + amount
    new_status = "refunded" if new_refunded >= charge["amount"] else "partially_refunded"
    await db.charges.update_one(
        {"_id": charge["_id"]},
        {"$set": {"amount_refunded": new_refunded, "status": new_status}},
    )
    # Update PI status
    pi_status = "succeeded" if new_status == "partially_refunded" else "succeeded"
    if new_status == "refunded":
        pi_status = "succeeded"  # PI stays succeeded but charge is refunded
    await db.payment_intents.update_one(
        {"_id": ObjectId(charge["payment_intent_id"])},
        {"$set": {"refunded": new_status == "refunded"}},
    )

    # Deduct from merchant balance
    fee_refund_portion = int(round(charge.get("fee", 0) * (amount / charge["amount"])))
    net_refund = amount - fee_refund_portion
    await db.users.update_one(
        {"_id": ObjectId(merchant_id)},
        {"$inc": {"balance_cents": -net_refund}},
    )
    await db.ledger_entries.insert_one({
        "merchant_id": merchant_id,
        "type": "refund",
        "amount": -net_refund,
        "gross": -amount,
        "fee": -fee_refund_portion,
        "currency": charge["currency"],
        "ref_id": refund_id,
        "ref_type": "refund",
        "description": f"Refund for {charge.get('card_brand', 'card')} •••• {charge.get('card_last4', '')}",
        "created_at": now,
    })
    await _enqueue_webhook(merchant_id, "charge.refunded", {**charge, "id": str(charge["_id"]), "amount_refunded": new_refunded})
    refund_doc["id"] = refund_id
    refund_doc.pop("_id", None)
    return refund_doc


async def _enqueue_webhook(merchant_id: str, event_type: str, data: dict):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    safe_data = {}
    for k, v in (data or {}).items():
        if isinstance(v, ObjectId):
            safe_data[k] = str(v)
        else:
            safe_data[k] = v
    event_doc = {
        "merchant_id": merchant_id,
        "event_type": event_type,
        "data": safe_data,
        "status": "delivered_simulated",
        "attempts": 1,
        "created_at": now,
    }
    await db.webhook_events.insert_one(event_doc)
