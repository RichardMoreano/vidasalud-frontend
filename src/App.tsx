import { useState } from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Appointments } from "./pages/Appointments";
import { Catalog } from "./pages/Catalog";
import { Reports } from "./pages/Reports";
import { Audit } from "./pages/Audit";

import { 
  LayoutDashboard, 
  CalendarCheck, 
  Stethoscope, 
  BarChart3, 
  ShieldCheck,
  HeartPulse
} from "lucide-react";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const [currentView, setCurrentView] = useState<"dashboard" | "appointments" | "catalog" | "reports" | "audit">("dashboard");

  if (!isAuthenticated) {
    return <Login onEnterDashboard={() => setCurrentView("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navegación Superior */}
      <header className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-white p-2 rounded-xl shadow-md shadow-emerald-500/20">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">
            VIDA<span className="text-emerald-600">SALUD</span>
          </span>
        </div>

        {/* Links de Navegación */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "appointments", label: "Atenciones", icon: CalendarCheck },
            { id: "catalog", label: "Catálogo", icon: Stethoscope },
            { id: "reports", label: "Reportería", icon: BarChart3 },
            { id: "audit", label: "Auditoría", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Renderizado de Pantallas */}
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