# Voltpay — Payment Processing Platform (PRD)

## Original problem statement
Build a full-stack proprietary payment processor similar to Stripe with merchant accounts, API keys, payment intents, hosted checkout, refunds, webhooks, balance/ledger, developer docs, and dashboard. Tech stack: FastAPI + MongoDB + React (chosen over the originally-spec'd Node/Postgres for this environment).

## Architecture
- **Backend**: FastAPI, split into modules: `server.py`, `routes_auth.py`, `routes_dashboard.py`, `routes_public.py`, `routes_checkout.py`, `public_helpers.py`, `payment_engine.py`, `auth.py`, `models.py`, `db.py`
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn primitives + Recharts. Cabinet Grotesk display / IBM Plex Sans body / JetBrains Mono code.
- **Auth**: JWT (HS256) in httpOnly cookies + Bearer fallback. Secret API keys (`sk_test_...`) for public `/api/v1/*` endpoints.
- **Database**: MongoDB. Indexes on email/api keys/payment_intents/charges/refunds/ledger. TTL index on idempotency_keys (24h).

## What's implemented (v1.0 — 2026-05-26)
- Merchant signup/login with brute-force lockout (5 fails / 15 min, IP+email keyed via X-Forwarded-For)
- Auto-issued test API keys (publishable + secret) on register; rotation endpoint
- Public REST API at `/api/v1/payment_intents|customers|charges|refunds|balance` with Bearer-key auth + `Idempotency-Key` support
- Hosted Checkout: `/api/checkout/sessions` (Bearer key) + public `/checkout/{token}` page
- Simulated card engine: Luhn check, brand detection, 7 test card behaviors (success/decline/insufficient/expired/cvc/etc.), platform fee 2.9% + 30¢
- Charge lifecycle: authorize → capture → ledger entry → balance update; refunds (full/partial) with ledger adjustment
- Webhook endpoints (with signing secret) + event log
- Merchant Dashboard pages: Home (gross volume + 14-day chart + recent), Payments (filterable table + slide-out drawer with refund), Customers, Balance/Ledger, API Keys (reveal/copy/rotate), Webhooks, Developers (cURL/Node/Python snippets + endpoint reference + test cards), Settings
- Landing page with hero, features grid, dev terminal section, test cards, pricing
- 30/30 backend pytest cases passing; data-testid coverage across all interactive elements

## P0/P1 backlog (deferred)
- P1: Subscriptions (recurring billing engine, schedules)
- P1: Saved payment methods on Customer + `/v1/payment_methods` endpoints
- P1: WebSocket live transaction stream
- P1: Apple Pay / Google Pay real integration (currently placeholder buttons)
- P1: Webhook delivery worker (actually POST to URL with HMAC signature; events are currently logged as `delivered_simulated`)
- P1: Emergent Google OAuth (JWT email/password is shipped; Google was opted in but deferred for MVP)
- P2: Multi-currency FX, marketplace/Connect-style subaccounts, dispute management, KYC verification flow, AI fraud scoring, virtual cards, invoice PDFs, ACH simulation, full report CSV exports

## Test credentials
See `/app/memory/test_credentials.md`.
