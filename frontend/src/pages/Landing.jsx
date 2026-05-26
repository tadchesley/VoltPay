import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Bolt, ArrowUpRight, ShieldCheck, Zap, Code2, Globe,
  CreditCard, Lock, GitBranch, Sparkles,
} from "lucide-react";

const CodeSample = () => (
  <pre className="code-block text-[13px] leading-[1.6] m-0">
{`// Create a payment intent
const intent = await voltpay.paymentIntents.create({
  amount: 4999,
  currency: "usd",
  description: "Pro plan — monthly",
});

// Confirm with a tokenized card
await voltpay.paymentIntents.confirm(intent.id, {
  payment_method: { card: { number, exp_month, exp_year, cvc } }
});

// → status: "succeeded"  net: $49.99  fees: $0.00`}
  </pre>
);

const features = [
  { icon: Zap, title: "Sub-100ms payment intents", desc: "Our ledger-first engine authorizes, captures and settles without queue lag." },
  { icon: ShieldCheck, title: "PCI-conscious by default", desc: "Card data tokenized at the edge. Raw PANs and CVCs never touch your database." },
  { icon: Code2, title: "REST APIs developers love", desc: "Stripe-compatible verbs, idempotency keys, JSON everywhere, versioned forever." },
  { icon: GitBranch, title: "Webhooks with signed secrets", desc: "Real-time delivery for 40+ event types with automatic exponential retry." },
  { icon: Globe, title: "Multi-currency ready", desc: "Quote, charge and settle in 35 currencies with FX baked into the ledger." },
  { icon: Sparkles, title: "Fraud heuristics, on us", desc: "Lightweight scoring rejects obvious bots before they hit your auth endpoint." },
];

const testCards = [
  { num: "4242 4242 4242 4242", result: "Succeeds", tone: "ok" },
  { num: "4000 0000 0000 0002", result: "Declined", tone: "err" },
  { num: "4000 0000 0000 9995", result: "Insufficient funds", tone: "err" },
  { num: "4000 0000 0000 0069", result: "Expired card", tone: "err" },
];

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-text-secondary">{label}</span>
      <span className="text-volt font-medium">{value}</span>
    </div>
  );
}

export default function Landing() {
  const [copied, setCopied] = useState(false);
  const copyCmd = () => {
    navigator.clipboard.writeText("curl -X POST https://api.voltpay.dev/v1/payment_intents \\\n -u sk_test_xxx: -d amount=4999 -d currency=usd");
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-text-primary" data-testid="landing-page">
      {/* Nav */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-[1280px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-7 h-7 rounded-md bg-volt flex items-center justify-center">
              <Bolt size={16} className="text-black" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Voltpay</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors">Product</a>
            <a href="#developers" className="hover:text-text-primary transition-colors">Developers</a>
            <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
            <a href="#test-cards" className="hover:text-text-primary transition-colors">Test cards</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm" data-testid="nav-login">Sign in</Link>
            <Link to="/register" className="btn-volt text-sm" data-testid="nav-register">
              Start free <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute right-[-10%] top-[-10%] w-[600px] h-[600px] rounded-full bg-volt/10 blur-[120px] pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto px-8 py-24 lg:py-32 grid lg:grid-cols-[1.1fr,1fr] gap-12 items-center">
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-volt/10 border border-volt/20 text-volt text-xs font-medium uppercase tracking-[0.2em] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-volt pulse-soft" /> Now free for everyone
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
              The payment rail<br />
              <span className="text-volt accent-text-glow">built for builders.</span>
            </h1>
            <p className="mt-6 text-lg text-text-secondary max-w-xl leading-relaxed">
              Voltpay is a proprietary payment processor with its own ledger, settlement engine, and developer APIs.
              Onboard merchants, accept cards, issue refunds, and ship checkout — all in one stack.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-volt" data-testid="hero-cta-register">
                Open merchant account <ArrowUpRight size={16} />
              </Link>
              <a href="#developers" className="btn-secondary" data-testid="hero-cta-docs">
                Read the docs
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs font-mono text-text-muted">
              <div className="flex items-center gap-1.5"><Lock size={12} /> PCI-conscious</div>
              <div className="flex items-center gap-1.5"><ShieldCheck size={12} /> Webhook-signed</div>
              <div className="flex items-center gap-1.5"><Zap size={12} /> 99.99% uptime</div>
            </div>
          </div>

          {/* Right: floating code card */}
          <div className="relative fade-up" style={{ animationDelay: "120ms" }}>
            <div className="absolute -inset-4 bg-volt/5 blur-2xl rounded-3xl" />
            <div className="relative card-base p-1.5 accent-glow">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                </div>
                <div className="font-mono text-[10px] text-text-muted uppercase tracking-widest">node.js</div>
              </div>
              <CodeSample />
            </div>
            <div className="absolute -bottom-6 -right-6 card-base px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CreditCard size={14} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">visa •••• 4242</div>
                <div className="text-sm font-medium">+ $49.99</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-[var(--border)] py-24">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-volt mb-3">Platform</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              One payment stack.<br /> All the primitives.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden">
            {features.map(({ icon: Icon, title, desc }, idx) => (
              <div
                key={idx}
                data-testid={`feature-card-${idx}`}
                className="bg-[var(--bg)] p-8 hover:bg-surface transition-colors group"
              >
                <div className="w-10 h-10 rounded-md border border-[var(--border)] flex items-center justify-center mb-5 group-hover:border-volt/40 group-hover:bg-volt/5 transition-colors">
                  <Icon size={18} className="text-volt" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developers section */}
      <section id="developers" className="border-b border-[var(--border)] py-24 bg-noise relative">
        <div className="max-w-[1280px] mx-auto px-8 grid lg:grid-cols-[1fr,1.3fr] gap-12 items-center">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-volt mb-3">Developers</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-5">
              Ship in 5 minutes.
            </h2>
            <p className="text-text-secondary leading-relaxed mb-8">
              Generate API keys instantly. Make your first charge with curl. Everything you need
              is free — keys, sandbox, production, all of it.
            </p>
            <button onClick={copyCmd} className="btn-secondary font-mono text-xs" data-testid="copy-curl-btn">
              {copied ? "Copied!" : "$ copy curl example"}
            </button>
          </div>
          <div className="card-base p-1.5 accent-glow">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
              <div className="font-mono text-[10px] text-text-muted uppercase tracking-widest">terminal</div>
              <div className="font-mono text-[10px] text-volt">200 OK</div>
            </div>
            <pre className="code-block text-[12px] leading-[1.7] m-0">
{`$ curl https://api.voltpay.dev/v1/payment_intents \\
  -u sk_test_4eC39H...: \\
  -d amount=4999 \\
  -d currency=usd

{
  "id": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
  "object": "payment_intent",
  "amount": 4999,
  "client_secret": "pi_secret_3MtwBw...",
  "status": "requires_payment_method",
  "created": 1697040000
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Test cards */}
      <section id="test-cards" className="border-b border-[var(--border)] py-24">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-volt mb-3">Test cards</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Try it instantly.</h2>
            <p className="text-text-secondary mt-3">Use any of these card numbers to simulate every payment outcome — success, decline, expired, and more.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {testCards.map((tc, i) => (
              <div
                key={i}
                className="card-base p-5 flex items-center justify-between hover:border-volt/30 transition-colors"
                data-testid={`test-card-${i}`}
              >
                <div>
                  <div className="font-mono text-base tracking-wider">{tc.num}</div>
                  <div className="text-xs text-text-muted mt-1 font-mono">any future date · any CVC</div>
                </div>
                <span className={`px-2.5 py-1 text-xs rounded-full border font-medium ${tc.tone === "ok" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
                  {tc.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="border-b border-[var(--border)] py-24">
        <div className="max-w-[1280px] mx-auto px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-volt mb-3">Pricing</div>
            <h2 className="font-display text-6xl font-bold tracking-tight">
              Free<span className="text-text-muted">.</span>
            </h2>
            <p className="text-text-secondary mt-4 max-w-md text-lg leading-relaxed">
              Every feature, every transaction, every merchant — free, forever. No setup fees,
              no per-transaction fees, no hidden costs.
            </p>
            <Link to="/register" className="btn-volt mt-8" data-testid="pricing-cta">
              Get started <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="card-base p-8 space-y-3 text-sm">
            <Row label="Card payments" value="Free" />
            <Row label="Tokenization" value="Free" />
            <Row label="Webhooks" value="Free" />
            <Row label="Hosted checkout" value="Free" />
            <Row label="Dashboard & reports" value="Free" />
            <Row label="Refunds" value="Free" />
            <Row label="Transaction volume" value="Unlimited" />
            <div className="border-t border-[var(--border)] pt-3 mt-3 text-xs text-text-muted">
              No credit card required. No trial period. Everything you see is included.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12">
        <div className="max-w-[1280px] mx-auto px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-volt flex items-center justify-center">
              <Bolt size={16} className="text-black" />
            </div>
            <span className="font-display font-bold tracking-tight">Voltpay</span>
            <span className="text-xs text-text-muted ml-2 font-mono">© 2026</span>
          </div>
          <div className="text-xs text-text-muted">An independent payment network — free for every merchant.</div>
        </div>
      </footer>
    </div>
  );
}
