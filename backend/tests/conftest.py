import os
import pytest
import requests
import uuid
from pathlib import Path
from dotenv import load_dotenv

# Load frontend env to get public BACKEND_URL the user sees
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def merchant_account():
    """Register a unique merchant for this test session. Returns dict with email, password, access_token, id."""
    email = f"TEST_merchant_{uuid.uuid4().hex[:10]}@voltpay-test.io"
    password = "TestPass1234!"
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": password,
        "business_name": "TEST Merchant", "country": "US",
    })
    assert r.status_code == 200, f"Registration failed: {r.status_code} {r.text}"
    data = r.json()
    return {
        "email": email, "password": password,
        "access_token": data["access_token"], "id": data["id"],
        "cookies": s.cookies.get_dict(),
    }


@pytest.fixture
def auth_client(merchant_account):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {merchant_account['access_token']}",
    })
    return s


@pytest.fixture(scope="session")
def secret_key(merchant_account):
    """Fetch the merchant's secret API key."""
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {merchant_account['access_token']}",
    })
    r = s.get(f"{BASE_URL}/api/api-keys")
    assert r.status_code == 200, r.text
    keys = r.json()
    active = [k for k in keys if not k.get("revoked")]
    assert active, "No active API keys"
    return active[0]["secret_key"]


@pytest.fixture
def pub_client(secret_key):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {secret_key}",
    })
    return s
