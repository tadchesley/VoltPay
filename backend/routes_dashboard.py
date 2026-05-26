"""Dashboard routes - merchant-facing (JWT auth). Includes customers, payment_intents,
charges, refunds, api_keys, webhooks, balance, stats."""
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId

from db import get_db
from auth import (
    get_current_user, generate_publishable_key, generate_secret_key,
    generate_webhook_secret,
)
from models import CustomerCreate, RefundCreate, WebhookEndpointCreate

router = APIRouter(prefix="/api", tags=["dashboard"])


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


# ===== API Keys =====

@router.get("/api-keys")
async def list_api_keys(user: dict = Depends(get_current_user)):
    db = get_db()
    keys = await db.api_keys.find({"merchant_id": user["id"]}).to_list(50)
    return [_serialize(k) for k in keys]


@router.post("/api-keys/rotate")
async def rotate_api_keys(user: dict = Depends(get_current_user)):
    db = get_db()
    # Revoke existing
    await db.api_keys.update_many(
        {"merchant_id": user["id"], "revoked": False},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}},
    )
    new_doc = {
        "merchant_id": user["id"],
        "publishable_key": generate_publishable_key("test"),
        "secret_key": generate_secret_key("test"),
        "mode": "test",
        "revoked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None,
    }
    result = await db.api_keys.insert_one(new_doc)
    new_doc["id"] = str(result.inserted_id)
    new_doc.pop("_id", None)
    return new_doc


# ===== Customers =====

@router.post("/customers")
async def create_customer(payload: CustomerCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = {
        "merchant_id": user["id"],
        "email": payload.email,
        "name": payload.name,
        "description": payload.description,
        "metadata": payload.metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.customers.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/customers")
async def list_customers(user: dict = Depends(get_current_user), limit: int = 100):
    db = get_db()
    cursor = db.customers.find({"merchant_id": user["id"]}).sort("created_at", -1).limit(limit)
    return [_serialize(c) for c in await cursor.to_list(limit)]


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    c = await db.customers.find_one({"_id": ObjectId(customer_id), "merchant_id": user["id"]})
    if not c:
        raise HTTPException(404, "Customer not found")
    return _serialize(c)


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    r = await db.customers.delete_one({"_id": ObjectId(customer_id), "merchant_id": user["id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Customer not found")
    return {"deleted": True, "id": customer_id}


# ===== Payment Intents (dashboard view) =====

@router.get("/payment_intents")
async def list_payment_intents(
    user: dict = Depends(get_current_user),
    limit: int = 50,
    status: Optional[str] = None,
):
    db = get_db()
    q = {"merchant_id": user["id"]}
    if status:
        q["status"] = status
    cursor = db.payment_intents.find(q).sort("created_at", -1).limit(limit)
    items = [_serialize(p) for p in await cursor.to_list(limit)]
    return items


@router.get("/payment_intents/{pi_id}")
async def get_payment_intent_detail(pi_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    pi = await db.payment_intents.find_one({"_id": ObjectId(pi_id), "merchant_id": user["id"]})
    if not pi:
        raise HTTPException(404, "Payment intent not found")
    pi = _serialize(pi)
    charges = await db.charges.find({"payment_intent_id": pi["id"]}).sort("created_at", -1).to_list(20)
    refunds = await db.refunds.find({"payment_intent_id": pi["id"]}).sort("created_at", -1).to_list(20)
    pi["charges"] = [_serialize(c) for c in charges]
    pi["refunds"] = [_serialize(r) for r in refunds]
    return pi


# ===== Charges =====

@router.get("/charges")
async def list_charges(user: dict = Depends(get_current_user), limit: int = 100):
    db = get_db()
    cursor = db.charges.find({"merchant_id": user["id"]}).sort("created_at", -1).limit(limit)
    return [_serialize(c) for c in await cursor.to_list(limit)]


# ===== Refunds =====

@router.post("/refunds")
async def create_refund(payload: RefundCreate, user: dict = Depends(get_current_user)):
    from public_helpers import process_refund
    return await process_refund(user["id"], payload)


@router.get("/refunds")
async def list_refunds(user: dict = Depends(get_current_user), limit: int = 100):
    db = get_db()
    cursor = db.refunds.find({"merchant_id": user["id"]}).sort("created_at", -1).limit(limit)
    return [_serialize(r) for r in await cursor.to_list(limit)]


# ===== Webhooks =====

@router.post("/webhook_endpoints")
async def create_webhook_endpoint(payload: WebhookEndpointCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    doc = {
        "merchant_id": user["id"],
        "url": payload.url,
        "events": payload.events,
        "description": payload.description,
        "secret": generate_webhook_secret(),
        "enabled": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.webhook_endpoints.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/webhook_endpoints")
async def list_webhook_endpoints(user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.webhook_endpoints.find({"merchant_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [_serialize(i) for i in items]


@router.delete("/webhook_endpoints/{ep_id}")
async def delete_webhook_endpoint(ep_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    r = await db.webhook_endpoints.delete_one({"_id": ObjectId(ep_id), "merchant_id": user["id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Endpoint not found")
    return {"deleted": True}


@router.get("/webhook_events")
async def list_webhook_events(user: dict = Depends(get_current_user), limit: int = 100):
    db = get_db()
    items = await db.webhook_events.find({"merchant_id": user["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return [_serialize(i) for i in items]


# ===== Balance & Ledger =====

@router.get("/balance")
async def get_balance(user: dict = Depends(get_current_user)):
    db = get_db()
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {
        "available_cents": user_doc.get("balance_cents", 0),
        "pending_cents": user_doc.get("pending_balance_cents", 0),
        "currency": user_doc.get("currency", "usd"),
    }


@router.get("/ledger")
async def list_ledger(user: dict = Depends(get_current_user), limit: int = 100):
    db = get_db()
    items = await db.ledger_entries.find({"merchant_id": user["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return [_serialize(i) for i in items]


# ===== Stats / Dashboard Home =====

@router.get("/stats/overview")
async def stats_overview(user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    today_iso = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_iso = (now - timedelta(days=7)).isoformat()
    month_iso = (now - timedelta(days=30)).isoformat()

    pipeline_gross = [
        {"$match": {"merchant_id": user["id"], "status": "succeeded"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    gross = await db.charges.aggregate(pipeline_gross).to_list(1)
    gross_total = gross[0]["total"] if gross else 0
    gross_count = gross[0]["count"] if gross else 0

    today_pipeline = [
        {"$match": {"merchant_id": user["id"], "status": "succeeded", "created_at": {"$gte": today_iso}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    today = await db.charges.aggregate(today_pipeline).to_list(1)

    week_pipeline = [
        {"$match": {"merchant_id": user["id"], "status": "succeeded", "created_at": {"$gte": week_iso}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    week = await db.charges.aggregate(week_pipeline).to_list(1)

    failed_pipeline = [
        {"$match": {"merchant_id": user["id"], "status": "failed", "created_at": {"$gte": month_iso}}},
        {"$group": {"_id": None, "count": {"$sum": 1}}},
    ]
    failed = await db.charges.aggregate(failed_pipeline).to_list(1)

    total_attempts_pipeline = [
        {"$match": {"merchant_id": user["id"], "created_at": {"$gte": month_iso}}},
        {"$group": {"_id": None, "count": {"$sum": 1}}},
    ]
    attempts = await db.charges.aggregate(total_attempts_pipeline).to_list(1)
    attempts_count = attempts[0]["count"] if attempts else 0
    failed_count = failed[0]["count"] if failed else 0
    success_rate = round(((attempts_count - failed_count) / attempts_count) * 100, 1) if attempts_count else 100.0

    customers_count = await db.customers.count_documents({"merchant_id": user["id"]})

    return {
        "gross_volume_cents": gross_total,
        "successful_charges": gross_count,
        "today_volume_cents": today[0]["total"] if today else 0,
        "today_count": today[0]["count"] if today else 0,
        "week_volume_cents": week[0]["total"] if week else 0,
        "success_rate": success_rate,
        "customers_count": customers_count,
    }


@router.get("/stats/revenue_series")
async def revenue_series(user: dict = Depends(get_current_user), days: int = 14):
    db = get_db()
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    cursor = db.charges.find({
        "merchant_id": user["id"],
        "status": "succeeded",
        "created_at": {"$gte": start.isoformat()},
    })
    bucket = {(start + timedelta(days=i)).strftime("%Y-%m-%d"): 0 for i in range(days)}
    async for c in cursor:
        try:
            day = c["created_at"][:10]
            if day in bucket:
                bucket[day] += c.get("amount", 0)
        except Exception:
            continue
    return [{"date": k, "amount_cents": v} for k, v in bucket.items()]
