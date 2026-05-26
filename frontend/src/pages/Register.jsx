import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bolt, ArrowRight, Mail, Lock as LockIcon, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("US");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ email, password, business_name: businessName, country });
      nav("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg)]" data-testid="register-page">
      <div className="hidden lg:flex flex-1 relative border-r border-[var(--border)] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -right-10 top-1/3 w-[420px] h-[420px] rounded-full bg-volt/10 blur-[120px]" />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 rounded-md bg-volt flex items-center justify-center">
              <Bolt size={18} className="text-black" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Voltpay</span>
          </Link>
          <div>
            <h2 className="font-display text-5xl font-bold tracking-tight leading-[1.05]">
              Start charging<br /><span className="text-volt">in 60 seconds.</span>
            </h2>
            <p className="text-text-secondary mt-5 max-w-md">
              Your free merchant account ships with API keys, a hosted checkout page, and the
              full dashboard. No credit card required, ever.
            </p>
            <ul className="mt-8 space-y-2.5 text-sm text-text-secondary">
              <li className="flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-volt" /> Unlimited transactions, zero fees</li>
              <li className="flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-volt" /> Real-time webhooks & event log</li>
              <li className="flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-volt" /> Full REST API + idempotency keys</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm" data-testid="register-form">
          <h1 className="font-display text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-text-secondary text-sm mb-8">
            Already a merchant?{" "}
            <Link to="/login" className="text-volt hover:underline" data-testid="link-to-login">Sign in</Link>
          </p>

          <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Business name</label>
          <div className="relative mb-4">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="register-business-input"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt"
              placeholder="Acme Inc."
            />
          </div>

          <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Email</label>
          <div className="relative mb-4">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="register-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt"
              placeholder="you@company.com"
            />
          </div>

          <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Password</label>
          <div className="relative mb-4">
            <LockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="register-password-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt"
              placeholder="At least 6 characters"
            />
          </div>

          <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Country</label>
          <select
            data-testid="register-country-input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-3 py-2.5 bg-surface border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt mb-6"
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="IN">India</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="AU">Australia</option>
            <option value="SG">Singapore</option>
          </select>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm" data-testid="register-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="register-submit-btn"
            className="btn-volt w-full disabled:opacity-50"
          >
            {submitting ? "Creating…" : (<>Create account <ArrowRight size={16} /></>)}
          </button>

          <div className="mt-6 text-center text-xs text-text-muted font-mono">
            By signing up you agree to our terms & privacy.
          </div>
        </form>
      </div>
    </div>
  );
}
