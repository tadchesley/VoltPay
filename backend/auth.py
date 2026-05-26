"""Authentication helpers: password hashing, JWT, API key generation, dependencies."""
import os
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Depends
from bson import ObjectId

from db import get_db

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60 * 12),
        "type": "access",
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, access: str, refresh: str):
    response.set_cookie(
        "access_token", access, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 12, path="/",
    )
    response.set_cookie(
        "refresh_token", refresh, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 24 * 7, path="/",
    )


def clear_auth_cookies(response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request) -> dict:
    db = get_db()
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user.pop("_id"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----- API key auth (for /v1/* public endpoints) -----

def generate_publishable_key(mode: str = "test") -> str:
    return f"pk_{mode}_{secrets.token_urlsafe(24).replace('-', '').replace('_', '')[:24]}"


def generate_secret_key(mode: str = "test") -> str:
    return f"sk_{mode}_{secrets.token_urlsafe(24).replace('-', '').replace('_', '')[:24]}"


def generate_webhook_secret() -> str:
    return f"whsec_{secrets.token_urlsafe(32).replace('-', '').replace('_', '')[:32]}"


async def get_merchant_from_api_key(request: Request) -> dict:
    """Authenticate a request using a secret API key in Authorization: Bearer header."""
    db = get_db()
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    key = auth_header[7:].strip()
    if not key.startswith("sk_"):
        raise HTTPException(status_code=401, detail="Invalid API key")
    record = await db.api_keys.find_one({"secret_key": key, "revoked": {"$ne": True}})
    if not record:
        raise HTTPException(status_code=401, detail="API key not found or revoked")
    merchant = await db.users.find_one({"_id": ObjectId(record["merchant_id"])})
    if not merchant:
        raise HTTPException(status_code=401, detail="Merchant not found")
    # Update last_used asynchronously
    await db.api_keys.update_one(
        {"_id": record["_id"]},
        {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}},
    )
    merchant["id"] = str(merchant.pop("_id"))
    merchant.pop("password_hash", None)
    return merchant
