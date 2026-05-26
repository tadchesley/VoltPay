import { useEffect, useState } from "react";
import { Copy, ExternalLink, Code2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const TABS = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
];

export default function Developers() {
  const [keys, setKeys] = useState(null);
  const [tab, setTab] = useState("curl");
  const sk = keys?.[0]?.secret_key || "sk_test_xxx";
  const pk = keys?.[0]?.publishable_key || "pk_test_xxx";
  const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://api.voltpay.dev";

  useEffect(() => {
    api.get("/api-keys").then(r => setKeys(r.data.filter(k => !k.revoked)));
  }, []);

  const snippets = {
    curl: `# 1. Create a payment intent
curl -X POST ${BACKEND}/api/v1/payment_intents \\
  -H "Authorization: Bearer ${sk}" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{"amount": 4999, "currency": "usd", "description": "Pro plan"}'

# 2. Confirm with a card
curl -X POST ${BACKEND}/api/v1/payment_intents/PI_ID/confirm \\
  -H "Authorization: Bearer ${sk}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "payment_method": {
      "card": {
        "number": "4242424242424242",
        "exp_month": 12,
        "exp_year": 2030,
        "cvc": "123"
      }
    }
  }'`,
    node: `import axios from 'axios';
const voltpay = axios.create({
  baseURL: '${BACKEND}/api/v1',
  headers: { Authorization: 'Bearer ${sk}' }
});

// Create + confirm in one flow
const { data: intent } = await voltpay.post('/payment_intents', {
  amount: 4999, currency: 'usd', description: 'Pro plan'
});

const { data: result } = await voltpay.post(\`/payment_intents/\${intent.id}/confirm\`, {
  payment_method: {
    card: { number: '4242424242424242', exp_month: 12, exp_year: 2030, cvc: '123' }
  }
});

console.log(result.status); // 'succeeded'`,
    python: `import requests

API = "${BACKEND}/api/v1"
H = {"Authorization": "Bearer ${sk}"}

intent = requests.post(f"{API}/payment_intents",
    headers=H, json={"amount": 4999, "currency": "usd"}).json()

result = requests.post(
    f"{API}/payment_intents/{intent['id']}/confirm",
    headers=H,
    json={"payment_method": {"card": {
        "number": "4242424242424242", "exp_month": 12,
        "exp_year": 2030, "cvc": "123"}}}
).json()

print(result["status"])  # 'succeeded'`,
  };

  const copy = (txt) => { navigator.clipboard.writeText(txt); toast.success("Copied"); };

  return (
    <div data-testid="developers-page" className="max-w-4xl">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">// developers</div>
        <h1 className="font-display text-4xl font-bold tracking-tight">API & docs</h1>
        <p className="text-text-secondary mt-2">Quickstart guides, test cards, and reference endpoints.</p>
      </div>

      {/* Quickstart */}
      <div className="card-base p-1.5 mb-8">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Code2 size={14} className="text-volt" />
            <span className="font-mono text-xs uppercase tracking-widest text-text-muted">Quickstart</span>
          </div>
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`px-3 py-1 rounded-md text-xs font-mono ${tab === t.id ? "bg-volt/10 text-volt" : "text-text-secondary hover:text-text-primary"}`}
              >
                {t.label}
              </button>
            ))}
            <button onClick={() => copy(snippets[tab])} className="btn-ghost p-2" data-testid="copy-snippet"><Copy size={14} /></button>
          </div>
        </div>
        <pre className="code-block m-0">{snippets[tab]}</pre>
      </div>

      {/* Reference */}
      <div className="card-base p-6 mb-6">
        <h2 className="font-display text-xl font-bold mb-4">Endpoint reference</h2>
        <div className="space-y-2 font-mono text-sm">
          {[
            ["POST", "/api/v1/payment_intents", "Create a PaymentIntent"],
            ["GET",  "/api/v1/payment_intents/:id", "Retrieve a PaymentIntent"],
            ["POST", "/api/v1/payment_intents/:id/confirm", "Confirm with a card"],
            ["POST", "/api/v1/customers", "Create a Customer"],
            ["GET",  "/api/v1/customers", "List Customers"],
            ["POST", "/api/v1/refunds", "Refund a Charge"],
            ["GET",  "/api/v1/refunds", "List Refunds"],
            ["GET",  "/api/v1/charges", "List Charges"],
            ["GET",  "/api/v1/balance", "Get account balance"],
            ["POST", "/api/checkout/sessions", "Create hosted Checkout session"],
          ].map(([m, path, desc]) => (
            <div key={path + m} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-elevated">
              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${m === "POST" ? "bg-volt/10 text-volt" : "bg-blue-500/10 text-blue-400"}`}>{m}</span>
              <span className="flex-1 truncate">{path}</span>
              <span className="text-text-muted text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-base p-6">
        <h2 className="font-display text-xl font-bold mb-4">Test cards</h2>
        <div className="space-y-2 font-mono text-sm">
          {[
            ["4242 4242 4242 4242", "Succeeds — visa", "ok"],
            ["5555 5555 5555 4444", "Succeeds — mastercard", "ok"],
            ["3782 822463 10005", "Succeeds — amex", "ok"],
            ["4000 0000 0000 0002", "Generic decline", "err"],
            ["4000 0000 0000 9995", "Insufficient funds", "err"],
            ["4000 0000 0000 0069", "Expired card", "err"],
            ["4000 0000 0000 0127", "Incorrect CVC", "err"],
          ].map(([num, label, tone]) => (
            <div key={num} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-elevated" data-testid={`docs-test-card-${num.replaceAll(' ', '')}`}>
              <span>{num}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${tone === "ok" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
