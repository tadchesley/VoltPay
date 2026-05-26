"""Checkout session routes - public hosted checkout pages.
- POST /api/checkout/sessions  (requires API key) -> creates a session, returns URL
- GET /api/checkout/sessions/{session_id}  (public, requires session id) -> public details for page
- POST /api/checkout/sessions/{session_id}/pay  (public) -> attempts payment with card"""
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from db import get_db
from auth import get_merchant_from_api_key
from models import CheckoutSessionCreate, CheckoutPay, PaymentIntentCreate, PaymentIntentConfirm, PaymentMethodCreate
from public_helpers import create_payment_intent, confirm_payment_intent

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


def _serialize(doc):
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/sessions")
async def create_checkout_session(payload: CheckoutSessionCreate, merchant: dict = Depends(get_merchant_from_api_key)):
    db = get_db()
    pi = await create_payment_intent(
        merchant["id"],
        PaymentIntentCreate(
            amount=payload.amount,
            currency=payload.currency,
            description=payload.product_name,
            receipt_email=payload.customer_email,
            metadata=payload.metadata,
        ),
    )
    session_token = f"cs_test_{secrets.token_urlsafe(28).replace('-', '').replace('_', '')[:32]}"
    now = datetime.now(timezone.utc)
    doc = {
        "merchant_id": merchant["id"],
        "session_token": session_token,
        "payment_intent_id": pi["id"],
        "amount": payload.amount,
        "currency": payload.currency.lower(),
        "product_name": payload.product_name,
        "customer_email": payload.customer_email,
        "success_url": payload.success_url,
        "cancel_url": payload.cancel_url,
        "status": "open",
        "metadata": payload.metadata,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=24)).isoformat(),
        "merchant_business_name": merchant.get("business_name", ""),
    }
    result = await db.checkout_sessions.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/sessions/{session_token}")
async def get_checkout_session(session_token: str):
    """Public endpoint - returns session data needed to render the checkout page."""
    db = get_db()
    s = await db.checkout_sessions.find_one({"session_token": session_token})
    if not s:
        raise HTTPException(404, "Session not found")
    return {
        "id": str(s["_id"]),
        "session_token": session_token,
        "amount": s["amount"],
        "currency": s["currency"],
        "product_name": s["product_name"],
        "status": s["status"],
        "merchant_business_name": s.get("merchant_business_name", ""),
        "customer_email": s.get("customer_email"),
        "success_url": s.get("success_url"),
        "expires_at": s.get("expires_at"),
    }


@router.post("/sessions/{session_token}/pay")
async def pay_checkout_session(session_token: str, payload: CheckoutPay):
    """Public endpoint to submit card payment for a session."""
    db = get_db()
    s = await db.checkout_sessions.find_one({"session_token": session_token})
    if not s:
        raise HTTPException(404, "Session not found")
    if s["status"] != "open":
        raise HTTPException(400, f"Session is {s['status']}")

    pi_id = s["payment_intent_id"]
    pi = await confirm_payment_intent(
        s["merchant_id"], pi_id,
        PaymentIntentConfirm(payment_method=PaymentMethodCreate(card=payload.card)),
    )
    new_status = "complete" if pi.get("status") == "succeeded" else "open"
    await db.checkout_sessions.update_one(
        {"_id": s["_id"]},
        {"$set": {"status": new_status, "customer_email": payload.email or s.get("customer_email")}},
    )
    return {
        "status": new_status,
        "payment_intent": _serialize(pi),
        "session_token": session_token,
    }
