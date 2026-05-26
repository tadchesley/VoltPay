"""MongoDB client singleton."""
import os
from motor.motor_asyncio import AsyncIOMotorClient


_client: AsyncIOMotorClient | None = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        _db = _client[os.environ["DB_NAME"]]
    return _db


async def init_indexes():
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.api_keys.create_index("merchant_id")
    await db.api_keys.create_index("secret_key", unique=True)
    await db.api_keys.create_index("publishable_key", unique=True)
    await db.customers.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.customers.create_index([("merchant_id", 1), ("email", 1)])
    await db.payment_intents.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.payment_intents.create_index("client_secret")
    await db.charges.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.charges.create_index("payment_intent_id")
    await db.refunds.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.refunds.create_index("charge_id")
    await db.checkout_sessions.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.webhook_endpoints.create_index("merchant_id")
    await db.webhook_events.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.ledger_entries.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.audit_logs.create_index([("merchant_id", 1), ("created_at", -1)])
    await db.idempotency_keys.create_index("key", unique=True)
    await db.idempotency_keys.create_index("created_at", expireAfterSeconds=86400)
    await db.login_attempts.create_index("identifier")
