import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bolt, ArrowRight, Mail, Lock as LockIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg)]" data-testid="login-page">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-1 relative border-r border-[var(--border)] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -left-10 top-1/3 w-[420px] h-[420px] rounded-full bg-volt/10 blur-[120px]" />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <Link to="/" className="flex items-center gap-2 w-fit" data-testid="logo-link">
            <div className="w-8 h-8 rounded-md bg-volt flex items-center justify-center">
              <Bolt size={18} className="text-black" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Voltpay</span>
          </Link>
          <div>
            <h2 className="font-display text-5xl font-bold tracking-tight leading-[1.05]">
              Welcome back<br /><span className="text-volt">to the rail.</span>
            </h2>
            <p className="text-text-secondary mt-5 max-w-md">
              Sign in to your merchant dashboard to manage transactions, customers, and your API keys.
            </p>
            <div className="mt-10 font-mono text-xs text-text-muted">
              "Payments shouldn't feel like an integration. They should feel like a primitive." — Voltpay
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm" data-testid="login-form">
          <h1 className="font-display text-3xl font-bold mb-2">Sign in</h1>
          <p className="text-text-secondary text-sm mb-8">
            New here?{" "}
            <Link to="/register" className="text-volt hover:underline" data-testid="link-to-register">
              Create a merchant account
            </Link>
          </p>

          <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Email</label>
          <div className="relative mb-4">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="login-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt"
              placeholder="you@company.com"
            />
          </div>

          <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Password</label>
          <div className="relative mb-6">
            <LockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="login-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            data-testid="login-submit-btn"
            className="btn-volt w-full disabled:opacity-50"
          >
            {submitting ? "Signing in…" : (<>Sign in <ArrowRight size={16} /></>)}
          </button>

          <div className="mt-6 text-center text-xs text-text-muted font-mono">
            Protected by Voltpay shield — RBAC + audit log
          </div>
        </form>
      </div>
    </div>
  );
}
