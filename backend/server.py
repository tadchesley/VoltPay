"""Main FastAPI entrypoint."""
from dotenv import load_dotenv
from pathlib import Path

# Load env vars BEFORE any other imports that read os.environ
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db import get_db, init_indexes
from routes_auth import router as auth_router
from routes_dashboard import router as dashboard_router
from routes_public import router as public_router
from routes_checkout import router as checkout_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_indexes()
    logger.info("MongoDB indexes initialized")
    yield


app = FastAPI(title="Voltpay Payment Platform", version="1.0.0", lifespan=lifespan)

# CORS - must allow credentials with explicit origin (no '*')
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [frontend_url, "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/")
async def root():
    return {"name": "Voltpay", "version": "1.0.0", "status": "ok"}


app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(public_router)
app.include_router(checkout_router)
