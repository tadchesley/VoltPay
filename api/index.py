"""Vercel serverless entrypoint for the FastAPI backend.
Vercel routes /api/* to this file. We import the existing FastAPI app from
backend/server.py and re-export it as `app` so @vercel/python picks it up.
"""
import sys
import os
from pathlib import Path

# Add the backend directory to Python path so its modules import normally.
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# The backend reads MONGO_URL / DB_NAME / JWT_SECRET / FRONTEND_URL from env vars.
# On Vercel these are set in Project Settings → Environment Variables (no .env file).
from server import app  # noqa: E402,F401
