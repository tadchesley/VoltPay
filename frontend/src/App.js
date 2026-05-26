import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import HostedCheckout from "@/pages/HostedCheckout";

import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import Home from "@/pages/dashboard/Home";
import Payments from "@/pages/dashboard/Payments";
import Customers from "@/pages/dashboard/Customers";
import Balance from "@/pages/dashboard/Balance";
import ApiKeys from "@/pages/dashboard/ApiKeys";
import Webhooks from "@/pages/dashboard/Webhooks";
import Developers from "@/pages/dashboard/Developers";
import Settings from "@/pages/dashboard/Settings";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: { background: "#121212", border: "1px solid #27272A", color: "#fff", fontFamily: "IBM Plex Sans, sans-serif" },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout/:token" element={<HostedCheckout />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Home />} />
            <Route path="payments" element={<Payments />} />
            <Route path="customers" element={<Customers />} />
            <Route path="balance" element={<Balance />} />
            <Route path="api-keys" element={<ApiKeys />} />
            <Route path="webhooks" element={<Webhooks />} />
            <Route path="developers" element={<Developers />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
