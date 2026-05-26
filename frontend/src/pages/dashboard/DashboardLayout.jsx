import Sidebar from "@/components/Sidebar";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-text-primary">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1280px] mx-auto px-8 py-8" data-testid="dashboard-main">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
