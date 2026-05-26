"""Simulated payment processor: tokenization, authorization, capture, refund, fees."""
import os
import re
import secrets
from datetime import datetime, timezone


# Test card behaviors (Stripe-style)
TEST_CARDS = {
    "4242424242424242": {"outcome": "succeeded", "brand": "visa"},
    "4000000000000002": {"outcome": "declined", "brand": "visa", "code": "card_declined", "message": "Your card was declined."},
    "4000000000009995": {"outcome": "declined", "brand": "visa", "code": "insufficient_funds", "message": "Your card has insufficient funds."},
    "4000000000000069": {"outcome": "declined", "brand": "visa", "code": "expired_card", "message": "Your card has expired."},
    "4000000000000119": {"outcome": "declined", "brand": "visa", "code": "processing_error", "message": "An error occurred while processing your card."},
    "4000000000000127": {"outcome": "declined", "brand": "visa", "code": "incorrect_cvc", "message": "Your card's security code is incorrect."},
    "5555555555554444": {"outcome": "succeeded", "brand": "mastercard"},
    "378282246310005": {"outcome": "succeeded", "brand": "amex"},
    "6011111111111117": {"outcome": "succeeded", "brand": "discover"},
}


def detect_brand(pan: str) -> str:
    if pan.startswith("4"):
        return "visa"
    if pan[:2] in {"51", "52", "53", "54", "55"} or (len(pan) >= 4 and pan[:4].isdigit() and 2221 <= int(pan[:4]) <= 2720):
        return "mastercard"
    if pan.startswith(("34", "37")):
        return "amex"
    if pan.startswith("6011") or pan.startswith("65"):
        return "discover"
    return "unknown"


def luhn_valid(pan: str) -> bool:
    digits = [int(d) for d in pan if d.isdigit()]
    if len(digits) < 12:
        return False
    checksum = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


def tokenize_card(pan: str, exp_month: int, exp_year: int, cvc: str) -> dict:
    """Return a card token (never stores PAN or CVC). Validates basic format."""
    pan_clean = re.sub(r"\s+", "", pan or "")
    if not pan_clean.isdigit() or len(pan_clean) < 12 or len(pan_clean) > 19:
        raise ValueError("Invalid card number format")
    if not (1 <= int(exp_month) <= 12):
        raise ValueError("Invalid expiration month")
    if int(exp_year) < datetime.now(timezone.utc).year:
        raise ValueError("Invalid expiration year")
    if not cvc or not str(cvc).isdigit() or not (3 <= len(str(cvc)) <= 4):
        raise ValueError("Invalid CVC")
    brand = TEST_CARDS.get(pan_clean, {}).get("brand") or detect_brand(pan_clean)
    return {
        "token": f"tok_{secrets.token_urlsafe(20).replace('-', '').replace('_', '')[:24]}",
        "brand": brand,
        "last4": pan_clean[-4:],
        "exp_month": int(exp_month),
        "exp_year": int(exp_year),
        "pan_fingerprint": pan_clean,  # used internally only for outcome determination
    }


def authorize_charge(amount_cents: int, card_token: dict) -> dict:
    """Simulate authorization step. Returns outcome dict."""
    pan = card_token.get("pan_fingerprint", "")
    behavior = TEST_CARDS.get(pan)
    if behavior and behavior["outcome"] == "declined":
        return {
            "status": "failed",
            "failure_code": behavior.get("code", "card_declined"),
            "failure_message": behavior.get("message", "Your card was declined."),
            "authorization_code": None,
        }
    # default success path for any luhn-valid card not in declined list
    if not luhn_valid(pan) and pan not in TEST_CARDS:
        return {
            "status": "failed",
            "failure_code": "invalid_number",
            "failure_message": "The card number is not a valid card number.",
            "authorization_code": None,
        }
    if amount_cents <= 0:
        return {
            "status": "failed",
            "failure_code": "amount_too_small",
            "failure_message": "Amount must be greater than 0.",
            "authorization_code": None,
        }
    return {
        "status": "succeeded",
        "failure_code": None,
        "failure_message": None,
        "authorization_code": f"auth_{secrets.token_urlsafe(8).replace('-','').replace('_','')[:10]}",
    }


def calculate_fee(amount_cents: int) -> int:
    """Platform fee: 2.9% + 30 cents."""
    percent = float(os.environ.get("PLATFORM_FEE_PERCENT", "2.9"))
    fixed = int(os.environ.get("PLATFORM_FEE_FIXED_CENTS", "30"))
    return int(round(amount_cents * percent / 100.0)) + fixed
