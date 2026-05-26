"""Public API routes - authenticated via secret API key (Bearer header).
Stripe-style: /api/v1/payment_intents, /api/v1/customers, /api/v1/refunds, etc."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from bson import ObjectId

from db import get_db
from auth import get_merchant_from_api_key
from models import (
    PaymentIntentCreate, PaymentIntentConfirm, CustomerCreate,
    RefundCreate,
)
from public_helpers import (
    create_payment_intent, confirm_payment_intent, process_refund,
)

router = APIRouter(prefix="/api/v1", tags=["public-api"])


async def _check_idempotency(request: Request, merchant_id: str) -> tuple[str | None, dict | None]:
    """Returns (key, cached_response). If cached_response is not None, return it directly."""
    key = request.headers.get("Idempotency-Key")
    if not key:
        return None, None
    db = get_db()
    full_key = f"{merchant_id}:{key}"
    existing = await db.idempotency_keys.find_one({"key": full_key})
    if existing:
        return full_key, existing.get("response")
    return full_key, None


async def _save_idempotent(full_key: str, response: dict):
    if not full_key:
        return
    db = get_db()
    await db.idempotency_keys.update_one(
        {"key": full_key},
        {"$set": {"key": full_key, "response": response, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


def _serialize(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


# ===== Payment Intents =====

@router.post("/payment_intents")
async def api_create_pi(payload: PaymentIntentCreate, request: Request, merchant: dict = Depends(get_merchant_from_api_key)):
    key, cached = await _check_idempotency(request, merchant["id"])
    if cached:
        return cached
    pi = await create_payment_intent(merchant["id"], payload)
    await _save_idempotent(key, pi)
    return pi


@router.get("/payment_intents/{pi_id}")
async def api_get_pi(pi_id: str, merchant: dict = Depends(get_merchant_from_api_key)):
    db = get_db()
    pi = await db.payment_intents.find_one({"_id": ObjectId(pi_id), "merchant_id": merchant["id"]})
    if not pi:
        raise HTTPException(404, "Payment intent not found")
    return _serialize(pi)


@router.post("/payment_intents/{pi_id}/confirm")
async def api_confirm_pi(pi_id: str, payload: PaymentIntentConfirm, request: Request, merchant: dict = Depends(get_merchant_from_api_key)):
    key, cached = await _check_idempotency(request, merchant["id"])
    if cached:
        return cached
    pi = await confirm_payment_intent(merchant["id"], pi_id, payload)
    pi = _serialize(pi)
    await _save_idempotent(key, pi)
    return pi


@router.get("/payment_intents")
async def api_list_pi(merchant: dict = Depends(get_merchant_from_api_key), limit: int = 25):
    db = get_db()
    items = await db.payment_intents.find({"merchant_id": merchant["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"object": "list", "data": [_serialize(i) for i in items], "has_more": False}


# ===== Customers =====

@router.post("/customers")
async def api_create_customer(payload: CustomerCreate, merchant: dict = Depends(get_merchant_from_api_key)):
    db = get_db()
    doc = {
        "merchant_id": merchant["id"],
        "email": payload.email,
        "name": payload.name,
        "description": payload.description,
        "metadata": payload.metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "object": "customer",
    }
    result = await db.customers.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/customers")
async def api_list_customers(merchant: dict = Depends(get_merchant_from_api_key), limit: int = 25):
    db = get_db()
    items = await db.customers.find({"merchant_id": merchant["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"object": "list", "data": [_serialize(i) for i in items], "has_more": False}


@router.get("/customers/{customer_id}")
async def api_get_customer(customer_id: str, merchant: dict = Depends(get_merchant_from_api_key)):
    db = get_db()
    c = await db.customers.find_one({"_id": ObjectId(customer_id), "merchant_id": merchant["id"]})
    if not c:
        raise HTTPException(404, "Customer not found")
    return _serialize(c)


# ===== Refunds =====

@router.post("/refunds")
async def api_create_refund(payload: RefundCreate, request: Request, merchant: dict = Depends(get_merchant_from_api_key)):
    key, cached = await _check_idempotency(request, merchant["id"])
    if cached:
        return cached
    refund = await process_refund(merchant["id"], payload)
    await _save_idempotent(key, refund)
    return refund


@router.get("/refunds")
async def api_list_refunds(merchant: dict = Depends(get_merchant_from_api_key), limit: int = 25):
    db = get_db()
    items = await db.refunds.find({"merchant_id": merchant["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"object": "list", "data": [_serialize(i) for i in items], "has_more": False}


# ===== Charges =====

@router.get("/charges")
async def api_list_charges(merchant: dict = Depends(get_merchant_from_api_key), limit: int = 25):
    db = get_db()
    items = await db.charges.find({"merchant_id": merchant["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"object": "list", "data": [_serialize(i) for i in items], "has_more": False}


@router.get("/charges/{charge_id}")
async def api_get_charge(charge_id: str, merchant: dict = Depends(get_merchant_from_api_key)):
    db = get_db()
    c = await db.charges.find_one({"_id": ObjectId(charge_id), "merchant_id": merchant["id"]})
    if not c:
        raise HTTPException(404, "Charge not found")
    return _serialize(c)


# ===== Balance =====

@router.get("/balance")
async def api_balance(merchant: dict = Depends(get_merchant_from_api_key)):
    db = get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(merchant["id"])})
    return {
        "object": "balance",
        "available": [{"amount": user_doc.get("balance_cents", 0), "currency": user_doc.get("currency", "usd")}],
        "pending": [{"amount": 0, "currency": user_doc.get("currency", "usd")}],
    }
