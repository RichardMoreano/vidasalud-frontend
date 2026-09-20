import { useMsal } from "@azure/msal-react";
import { LayoutDashboard, Calendar, BookOpen, LogOut, HeartPulse } from "lucide-react";

interface NavbarProps {
  activeTab: "dashboard" | "appointments" | "catalog";
  setActiveTab: (tab: "dashboard" | "appointments" | "catalog") => void;
}

export const Navbar = ({ activeTab, setActiveTab }: NavbarProps) => {
  const { instance, accounts } = useMsal();

  const handleLogout = () => {
    instance.logoutPopup().catch((e) => console.error(e));
  };

  return (
    <nav className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-lg">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-lg tracking-wide">
            VIDA<span className="text-emerald-400">SALUD</span>
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "dashboard" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "appointments" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" /> Atenciones
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "catalog" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" /> Catálogo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-slate-400 font-medium">{accounts[0]?.username}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white px-3 py-2 rounded-xl transition font-medium"
        >
          <LogOut className="w-4 h-4" /> Salir
        </button>
      </div>
    </nav>
  );
};