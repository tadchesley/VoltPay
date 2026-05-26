import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CreditCard, Users, Wallet, KeyRound,
  Webhook, FileCode2, Settings, LogOut, Bolt,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const nav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/balance", label: "Balance", icon: Wallet },
  { to: "/dashboard/api-keys", label: "API keys", icon: KeyRound },
  { to: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/dashboard/developers", label: "Developers", icon: FileCode2 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg)] h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-[var(--border)] flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-volt flex items-center justify-center accent-glow">
          <Bolt size={18} className="text-black" />
        </div>
        <div>
          <div className="font-display text-lg font-bold tracking-tight leading-none">Voltpay</div>
          <div className="text-[10px] uppercase font-medium tracking-[0.2em] text-volt/80 mt-0.5">Free forever</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5" data-testid="sidebar-nav">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-volt/10 text-volt"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
              }`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-[var(--border)]">
        <div className="px-2 py-2 mb-2">
          <div className="text-xs text-text-muted font-mono uppercase tracking-wider">Account</div>
          <div className="text-sm text-text-primary truncate mt-1">{user?.business_name || "Merchant"}</div>
          <div className="text-xs text-text-secondary truncate">{user?.email}</div>
        </div>
        <button
          data-testid="logout-btn"
          onClick={async () => { await logout(); navigate("/"); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
