// src/App.tsx
import { useState } from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Appointments } from "./pages/Appointments";
import { Catalog } from "./pages/Catalog";
import { Reports } from "./pages/Reports";
import { Audit } from "./pages/Audit";
import { Navbar, type ViewType } from "./components/Navbar";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");

  if (!isAuthenticated) {
    return <Login onEnterDashboard={() => setCurrentView("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="py-6">
        {currentView === "dashboard" && <Dashboard />}
        {currentView === "appointments" && <Appointments />}
        {currentView === "catalog" && <Catalog />}
        {currentView === "reports" && <Reports />}
        {currentView === "audit" && <Audit />}
      </main>
    </div>
  );
}