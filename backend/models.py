"""Pydantic models for the payment platform."""
from datetime import datetime, timezone
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ===== Auth =====

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    business_name: str = Field(min_length=1, max_length=120)
    country: str = Field(default="US", max_length=2)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ===== Customers =====

class CustomerCreate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


# ===== Payment Intent =====

class CardInput(BaseModel):
    number: str
    exp_month: int
    exp_year: int
    cvc: str


class PaymentMethodCreate(BaseModel):
    type: str = "card"
    card: CardInput


class PaymentIntentCreate(BaseModel):
    amount: int = Field(gt=0, description="Amount in cents")
    currency: str = Field(default="usd", max_length=3)
    customer_id: Optional[str] = None
    description: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    receipt_email: Optional[EmailStr] = None
    capture_method: str = Field(default="automatic")  # automatic | manual


class PaymentIntentConfirm(BaseModel):
    payment_method: Optional[PaymentMethodCreate] = None
    payment_method_token: Optional[str] = None  # tok_xxx
    return_url: Optional[str] = None


# ===== Refunds =====

class RefundCreate(BaseModel):
    charge_id: Optional[str] = None
    payment_intent_id: Optional[str] = None
    amount: Optional[int] = Field(default=None, gt=0)  # partial refund
    reason: Optional[str] = "requested_by_customer"


# ===== Checkout sessions =====

class CheckoutSessionCreate(BaseModel):
    amount: int = Field(gt=0)
    currency: str = "usd"
    product_name: str = "Payment"
    customer_email: Optional[EmailStr] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class CheckoutPay(BaseModel):
    card: CardInput
    name_on_card: Optional[str] = None
    email: Optional[EmailStr] = None


# ===== Webhook endpoints =====

class WebhookEndpointCreate(BaseModel):
    url: str
    events: List[str] = Field(default_factory=lambda: ["payment_intent.succeeded"])
    description: Optional[str] = None


# ===== API Keys =====

class ApiKeyRotateRequest(BaseModel):
    confirm: bool = True
