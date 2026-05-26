"""Authentication routes for merchants."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from bson import ObjectId

from db import get_db
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
    generate_publishable_key, generate_secret_key,
)
from models import RegisterRequest, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(payload: RegisterRequest, response: Response):
    db = get_db()
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "business_name": payload.business_name,
        "country": payload.country.upper(),
        "role": "merchant",
        "verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "balance_cents": 0,
        "currency": "usd",
        "payout_schedule": "daily",
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Generate initial API keys
    api_key_doc = {
        "merchant_id": user_id,
        "publishable_key": generate_publishable_key("test"),
        "secret_key": generate_secret_key("test"),
        "mode": "test",
        "revoked": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None,
    }
    await db.api_keys.insert_one(api_key_doc)

    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)

    return {
        "id": user_id,
        "email": email,
        "business_name": payload.business_name,
        "country": payload.country.upper(),
        "role": "merchant",
        "access_token": access,
    }


@router.post("/login")
async def login(payload: LoginRequest, response: Response, request: Request):
    db = get_db()
    email = payload.email.lower()
    # Extract real client IP from X-Forwarded-For (k8s ingress); fallback to request.client
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")
    identifier = f"{ip}:{email}"

    # Brute force check
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        last_attempt = attempts.get("last_attempt", "")
        last_dt = None
        try:
            last_dt = datetime.fromisoformat(last_attempt)
        except (ValueError, TypeError):
            last_dt = None
        if last_dt and (datetime.now(timezone.utc) - last_dt).total_seconds() < 900:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Clear attempts
    await db.login_attempts.delete_one({"identifier": identifier})

    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)

    return {
        "id": user_id,
        "email": email,
        "business_name": user.get("business_name", ""),
        "country": user.get("country", "US"),
        "role": user.get("role", "merchant"),
        "access_token": access,
    }


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "business_name": user.get("business_name", ""),
        "country": user.get("country", "US"),
        "role": user.get("role", "merchant"),
        "verified": user.get("verified", False),
        "created_at": user.get("created_at"),
    }
