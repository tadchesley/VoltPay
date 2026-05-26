"""Backend integration tests for Voltpay payment platform.
Covers: auth, api-keys, public API (PI + idempotency), refunds, dashboard
collections, customers, webhooks, checkout sessions, balance/ledger/stats."""
import os
import uuid
import time
import requests
import pytest
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")

VISA_OK = {"number": "4242424242424242", "exp_month": 12, "exp_year": 2030, "cvc": "123"}
VISA_DECLINE = {"number": "4000000000000002", "exp_month": 12, "exp_year": 2030, "cvc": "123"}


# ============== Health & Auth ==============

class TestHealthAndAuth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert r.json()["name"] == "Voltpay"

    def test_register_creates_user_and_api_key(self, api_client):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@voltpay-test.io"
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "abc12345",
            "business_name": "TEST Reg Co", "country": "US",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email.lower()
        assert data["business_name"] == "TEST Reg Co"
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 20
        # Cookies set
        assert "access_token" in api_client.cookies.get_dict()
        # Verify api key auto-created
        r2 = api_client.get(f"{BASE_URL}/api/api-keys")
        assert r2.status_code == 200
        keys = r2.json()
        assert len(keys) >= 1
        assert any(k["secret_key"].startswith("sk_test_") for k in keys)
        assert any(k["publishable_key"].startswith("pk_test_") for k in keys)

    def test_register_duplicate_email_rejected(self, api_client, merchant_account):
        r = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": merchant_account["email"], "password": "x12345678",
            "business_name": "X", "country": "US",
        })
        assert r.status_code == 400

    def test_login_success(self, api_client, merchant_account):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": merchant_account["email"], "password": merchant_account["password"],
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == merchant_account["email"].lower()
        assert "access_token" in data

    def test_login_invalid(self, api_client, merchant_account):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": merchant_account["email"], "password": "WRONG_PWD_!!",
        })
        assert r.status_code == 401

    def test_me_with_bearer(self, auth_client, merchant_account):
        r = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200, r.text
        assert r.json()["email"] == merchant_account["email"].lower()

    def test_me_without_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_brute_force_lockout(self, api_client):
        # Create a fresh user solely for brute force
        email = f"TEST_bf_{uuid.uuid4().hex[:8]}@voltpay-test.io"
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "goodpass1",
            "business_name": "BF", "country": "US",
        })
        codes = []
        for _ in range(6):
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": email, "password": "wrongwrong",
            })
            codes.append(r.status_code)
        # After 5 fails, subsequent attempts should return 429
        assert 429 in codes, f"Expected lockout; got codes {codes}"


# ============== API Keys ==============

class TestApiKeys:
    def test_list_keys(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/api-keys")
        assert r.status_code == 200
        keys = r.json()
        assert isinstance(keys, list) and len(keys) >= 1
        for k in keys:
            assert "_id" not in k
            assert "id" in k
            assert k["secret_key"].startswith("sk_")
            assert k["publishable_key"].startswith("pk_")

    def test_rotate_keys(self, auth_client):
        before = auth_client.get(f"{BASE_URL}/api/api-keys").json()
        old_active = [k for k in before if not k.get("revoked")]
        r = auth_client.post(f"{BASE_URL}/api/api-keys/rotate")
        assert r.status_code == 200, r.text
        new_key = r.json()
        assert new_key["secret_key"].startswith("sk_test_")
        # Old key should now be revoked
        after = auth_client.get(f"{BASE_URL}/api/api-keys").json()
        active_now = [k for k in after if not k.get("revoked")]
        assert new_key["secret_key"] in [k["secret_key"] for k in active_now]
        for k in old_active:
            still_active = [a for a in active_now if a["secret_key"] == k["secret_key"]]
            assert not still_active, "Old key should be revoked"


# ============== Public API: Payment Intents ==============

class TestPublicPaymentIntents:
    def test_reject_without_auth(self):
        r = requests.post(f"{BASE_URL}/api/v1/payment_intents", json={"amount": 1000})
        assert r.status_code == 401

    def test_reject_bad_scheme(self):
        r = requests.post(
            f"{BASE_URL}/api/v1/payment_intents",
            json={"amount": 1000},
            headers={"Authorization": "Token sk_test_foo"},
        )
        assert r.status_code == 401

    def test_create_pi(self, pub_client):
        r = pub_client.post(f"{BASE_URL}/api/v1/payment_intents", json={
            "amount": 4200, "currency": "usd", "description": "TEST PI"
        })
        assert r.status_code == 200, r.text
        pi = r.json()
        assert pi["status"] == "requires_payment_method"
        assert pi["amount"] == 4200
        assert "id" in pi and "_id" not in pi
        assert pi["client_secret"].startswith("pi_secret_")

    def test_confirm_pi_success_with_4242(self, pub_client, auth_client):
        # Balance before
        b1 = auth_client.get(f"{BASE_URL}/api/balance").json()["available_cents"]
        pi = pub_client.post(f"{BASE_URL}/api/v1/payment_intents", json={"amount": 5000}).json()
        r = pub_client.post(
            f"{BASE_URL}/api/v1/payment_intents/{pi['id']}/confirm",
            json={"payment_method": {"type": "card", "card": VISA_OK}},
        )
        assert r.status_code == 200, r.text
        confirmed = r.json()
        assert confirmed["status"] == "succeeded"
        assert confirmed["amount_received"] == 5000
        assert confirmed["latest_charge_id"]
        # Verify charge
        charges = auth_client.get(f"{BASE_URL}/api/charges").json()
        assert any(c["id"] == confirmed["latest_charge_id"] and c["status"] == "succeeded" for c in charges)
        # Balance should increase by the full amount (platform is free, no fees)
        b2 = auth_client.get(f"{BASE_URL}/api/balance").json()["available_cents"]
        # 0% fee + 0 cents fixed → net = amount
        assert b2 - b1 == 5000, f"Expected full 5000 added; got {b2 - b1}"
        # Ledger entry exists
        ledger = auth_client.get(f"{BASE_URL}/api/ledger").json()
        assert any(e["ref_id"] == confirmed["latest_charge_id"] for e in ledger)
        # Webhook events recorded
        events = auth_client.get(f"{BASE_URL}/api/webhook_events").json()
        assert any(e["event_type"] == "payment_intent.succeeded" for e in events)

    def test_confirm_pi_declined_with_0002(self, pub_client, auth_client):
        b1 = auth_client.get(f"{BASE_URL}/api/balance").json()["available_cents"]
        pi = pub_client.post(f"{BASE_URL}/api/v1/payment_intents", json={"amount": 3000}).json()
        r = pub_client.post(
            f"{BASE_URL}/api/v1/payment_intents/{pi['id']}/confirm",
            json={"payment_method": {"type": "card", "card": VISA_DECLINE}},
        )
        assert r.status_code == 200, r.text
        result = r.json()
        assert result["status"] == "requires_payment_method"
        assert result.get("last_payment_error", {}).get("code") == "card_declined"
        # Charge should exist with status failed
        charges = auth_client.get(f"{BASE_URL}/api/charges").json()
        failed_for_pi = [c for c in charges if c.get("payment_intent_id") == pi["id"]]
        assert failed_for_pi and failed_for_pi[0]["status"] == "failed"
        # Balance unchanged
        b2 = auth_client.get(f"{BASE_URL}/api/balance").json()["available_cents"]
        assert b1 == b2

    def test_idempotency_key(self, secret_key):
        s = requests.Session()
        s.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {secret_key}",
            "Idempotency-Key": f"idem_{uuid.uuid4().hex}",
        })
        body = {"amount": 999, "description": "idem test"}
        r1 = s.post(f"{BASE_URL}/api/v1/payment_intents", json=body)
        r2 = s.post(f"{BASE_URL}/api/v1/payment_intents", json=body)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["id"] == r2.json()["id"], "Idempotency-Key should return cached response"


# ============== Refunds (dashboard) ==============

class TestRefunds:
    def _create_succeeded_charge(self, pub_client, amount=2000):
        pi = pub_client.post(f"{BASE_URL}/api/v1/payment_intents", json={"amount": amount}).json()
        conf = pub_client.post(
            f"{BASE_URL}/api/v1/payment_intents/{pi['id']}/confirm",
            json={"payment_method": {"type": "card", "card": VISA_OK}},
        ).json()
        assert conf["status"] == "succeeded"
        return conf["latest_charge_id"], amount

    def test_full_refund(self, pub_client, auth_client):
        charge_id, amount = self._create_succeeded_charge(pub_client, 2000)
        b1 = auth_client.get(f"{BASE_URL}/api/balance").json()["available_cents"]
        r = auth_client.post(f"{BASE_URL}/api/refunds", json={"charge_id": charge_id})
        assert r.status_code == 200, r.text
        refund = r.json()
        assert refund["amount"] == amount
        assert refund["status"] == "succeeded"
        # Charge status updated
        charges = auth_client.get(f"{BASE_URL}/api/charges").json()
        chg = next(c for c in charges if c["id"] == charge_id)
        assert chg["status"] == "refunded"
        assert chg["amount_refunded"] == amount
        # Balance deducted by net portion (amount - fee_portion)
        b2 = auth_client.get(f"{BASE_URL}/api/balance").json()["available_cents"]
        assert b2 < b1

    def test_partial_refund(self, pub_client, auth_client):
        charge_id, amount = self._create_succeeded_charge(pub_client, 3000)
        r = auth_client.post(f"{BASE_URL}/api/refunds", json={"charge_id": charge_id, "amount": 1000})
        assert r.status_code == 200, r.text
        refund = r.json()
        assert refund["amount"] == 1000
        charges = auth_client.get(f"{BASE_URL}/api/charges").json()
        chg = next(c for c in charges if c["id"] == charge_id)
        assert chg["status"] == "partially_refunded"
        assert chg["amount_refunded"] == 1000


# ============== Customers ==============

class TestCustomers:
    def test_create_get_delete(self, auth_client):
        payload = {"email": "TEST_cust@voltpay-test.io", "name": "Cust"}
        r = auth_client.post(f"{BASE_URL}/api/customers", json=payload)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        g = auth_client.get(f"{BASE_URL}/api/customers/{cid}")
        assert g.status_code == 200 and g.json()["email"] == payload["email"]
        d = auth_client.delete(f"{BASE_URL}/api/customers/{cid}")
        assert d.status_code == 200
        g2 = auth_client.get(f"{BASE_URL}/api/customers/{cid}")
        assert g2.status_code == 404

    def test_list_customers(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/customers")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============== Webhooks ==============

class TestWebhooks:
    def test_create_endpoint_and_list(self, auth_client):
        r = auth_client.post(f"{BASE_URL}/api/webhook_endpoints", json={
            "url": "https://example.com/hook",
            "events": ["payment_intent.succeeded"],
            "description": "TEST webhook",
        })
        assert r.status_code == 200, r.text
        ep = r.json()
        assert ep["secret"].startswith("whsec_")
        assert ep["enabled"] is True
        lst = auth_client.get(f"{BASE_URL}/api/webhook_endpoints").json()
        assert any(e["id"] == ep["id"] for e in lst)

    def test_list_events(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/webhook_events")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============== Checkout Sessions ==============

class TestCheckoutSessions:
    def test_create_session_and_public_get(self, pub_client):
        r = pub_client.post(f"{BASE_URL}/api/checkout/sessions", json={
            "amount": 1599, "currency": "usd", "product_name": "TEST Widget",
        })
        assert r.status_code == 200, r.text
        sess = r.json()
        token = sess["session_token"]
        assert token.startswith("cs_test_")
        # Public GET (no auth)
        g = requests.get(f"{BASE_URL}/api/checkout/sessions/{token}")
        assert g.status_code == 200
        body = g.json()
        assert body["amount"] == 1599
        assert body["status"] == "open"

    def test_session_pay_success(self, pub_client):
        sess = pub_client.post(f"{BASE_URL}/api/checkout/sessions", json={
            "amount": 2599, "product_name": "TEST Item OK",
        }).json()
        token = sess["session_token"]
        r = requests.post(f"{BASE_URL}/api/checkout/sessions/{token}/pay", json={
            "card": VISA_OK, "name_on_card": "Test User", "email": "buyer@example.com",
        })
        assert r.status_code == 200, r.text
        out = r.json()
        assert out["status"] == "complete"
        assert out["payment_intent"]["status"] == "succeeded"

    def test_session_pay_declined(self, pub_client):
        sess = pub_client.post(f"{BASE_URL}/api/checkout/sessions", json={
            "amount": 1599, "product_name": "TEST Item Decline",
        }).json()
        token = sess["session_token"]
        r = requests.post(f"{BASE_URL}/api/checkout/sessions/{token}/pay", json={
            "card": VISA_DECLINE,
        })
        assert r.status_code == 200, r.text
        out = r.json()
        assert out["status"] == "open", f"Expected open after decline, got {out['status']}"
        assert out["payment_intent"]["status"] == "requires_payment_method"


# ============== Dashboard stats ==============

class TestStats:
    def test_overview(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/stats/overview")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["gross_volume_cents", "successful_charges", "today_volume_cents", "week_volume_cents", "success_rate", "customers_count"]:
            assert k in d

    def test_revenue_series(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/stats/revenue_series?days=14")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 14
        for entry in data:
            assert "date" in entry and "amount_cents" in entry

    def test_balance(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/balance")
        assert r.status_code == 200
        d = r.json()
        assert "available_cents" in d and "currency" in d

    def test_ledger(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/ledger")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_payment_intents_and_detail(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/payment_intents")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        if items:
            pid = items[0]["id"]
            d = auth_client.get(f"{BASE_URL}/api/payment_intents/{pid}")
            assert d.status_code == 200
            body = d.json()
            assert "charges" in body and "refunds" in body
