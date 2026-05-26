import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bolt, Lock, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import api, { formatCents } from "@/lib/api";

export default function HostedCheckout() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", name: "", email: "" });

  useEffect(() => {
    api.get(`/checkout/sessions/${token}`)
      .then(r => setSession(r.data))
      .catch(() => setErr("This checkout session is invalid or has expired."));
  }, [token]);

  const formatNum = (v) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  const formatExp = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length < 3) return d;
    return d.slice(0, 2) + "/" + d.slice(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setErr("");
    try {
      const [mm, yy] = (card.exp || "").split("/");
      const payload = {
        card: {
          number: card.number.replace(/\s/g, ""),
          exp_month: parseInt(mm || "0", 10),
          exp_year: yy ? 2000 + parseInt(yy, 10) : 0,
          cvc: card.cvc,
        },
        name_on_card: card.name,
        email: card.email,
      };
      const { data } = await api.post(`/checkout/sessions/${token}/pay`, payload);
      setResult(data);
      if (data.payment_intent?.status !== "succeeded") {
        setErr(data.payment_intent?.last_payment_error?.message || "Payment failed");
      }
    } catch (e) {
      setErr(e.response?.data?.detail || "Payment failed");
    } finally { setSubmitting(false); }
  };

  if (err && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="card-base p-8 max-w-md text-center">
          <XCircle size={32} className="text-red-400 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold mb-2">Checkout unavailable</h1>
          <p className="text-text-secondary text-sm">{err}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-text-secondary font-mono text-sm">Loading checkout…</div>
    );
  }

  if (result?.status === "complete" && result?.payment_intent?.status === "succeeded") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6" data-testid="checkout-success">
        <div className="bg-white text-black rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold mb-1">Payment received</h1>
          <p className="text-zinc-500 text-sm mb-6">{session.merchant_business_name}</p>
          <div className="text-4xl font-display font-bold tracking-tight mb-2">{formatCents(session.amount, session.currency)}</div>
          <div className="text-xs font-mono text-zinc-400">Transaction id: {result.payment_intent?.id?.slice(-12)}</div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
            <Lock size={12} /> Secured by Voltpay
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 py-10 relative overflow-hidden" data-testid="hosted-checkout">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-32 -left-20 w-[400px] h-[400px] rounded-full bg-volt/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Merchant header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-[var(--border)] text-xs font-mono text-text-secondary">
            <Bolt size={12} className="text-volt" /> {session.merchant_business_name || "Merchant"}
          </div>
        </div>

        {/* Checkout card - light card on dark for trust */}
        <form onSubmit={submit} className="bg-white text-black rounded-2xl p-7 shadow-2xl" data-testid="checkout-form">
          <div className="text-center mb-6">
            <div className="text-xs uppercase tracking-widest text-zinc-500 font-mono">{session.product_name}</div>
            <div className="font-display text-5xl font-bold tracking-tight mt-1">
              {formatCents(session.amount, session.currency)}
            </div>
          </div>

          {/* Wallet placeholders */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button type="button" disabled className="bg-black text-white text-sm font-medium py-2.5 rounded-md disabled:opacity-50 cursor-not-allowed" data-testid="apple-pay-btn">
               Pay
            </button>
            <button type="button" disabled className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-sm font-medium py-2.5 rounded-md disabled:opacity-50 cursor-not-allowed" data-testid="google-pay-btn">
              G Pay
            </button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-zinc-200" />
            <div className="text-xs text-zinc-400 font-mono uppercase tracking-widest">or pay by card</div>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Email</label>
          <input
            type="email"
            required
            value={card.email}
            onChange={(e) => setCard({ ...card, email: e.target.value })}
            className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-black mb-3"
            placeholder="you@example.com"
            data-testid="checkout-email-input"
          />

          <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Card number</label>
          <div className="relative mb-3">
            <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              required
              inputMode="numeric"
              value={card.number}
              onChange={(e) => setCard({ ...card, number: formatNum(e.target.value) })}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-200 rounded-md text-sm font-mono tracking-wider focus:outline-none focus:border-black"
              placeholder="1234 1234 1234 1234"
              data-testid="checkout-card-number"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Expiry</label>
              <input
                required
                value={card.exp}
                onChange={(e) => setCard({ ...card, exp: formatExp(e.target.value) })}
                className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-md text-sm font-mono focus:outline-none focus:border-black"
                placeholder="MM/YY"
                data-testid="checkout-exp"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">CVC</label>
              <input
                required
                inputMode="numeric"
                maxLength={4}
                value={card.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })}
                className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-md text-sm font-mono focus:outline-none focus:border-black"
                placeholder="123"
                data-testid="checkout-cvc"
              />
            </div>
          </div>

          <label className="block text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Name on card</label>
          <input
            required
            value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value })}
            className="w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:border-black mb-4"
            placeholder="J. Doe"
            data-testid="checkout-name"
          />

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-3" data-testid="checkout-error">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white font-medium py-3 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
            data-testid="checkout-pay-btn"
          >
            {submitting ? "Processing…" : `Pay ${formatCents(session.amount, session.currency)}`}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400 font-mono">
            <Lock size={11} /> Secured by Voltpay · Test mode
          </div>
        </form>

        <div className="text-center mt-5 text-xs text-text-muted font-mono">
          Use card <span className="text-volt">4242 4242 4242 4242</span> to simulate a successful payment.
        </div>
      </div>
    </div>
  );
}
