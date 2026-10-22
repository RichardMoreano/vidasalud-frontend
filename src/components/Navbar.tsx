import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  BarChart3, 
  ShieldCheck, 
  Cpu, 
  LogOut, 
  HeartPulse, 
  Bell, 
  Check, 
  Trash2,
  X
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export type ViewType = "dashboard" | "appointments" | "catalog" | "reports" | "audit" ;

interface NavbarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export const Navbar = ({ currentView, setCurrentView }: NavbarProps) => {
  const { instance, accounts } = useMsal();
  const { notifications, unreadCount, markAsRead, clearAll, activeToast, closeToast } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const account = accounts[0];
  const roles = (account?.idTokenClaims?.roles as string[]) || [];
  const isAdmin = roles.includes("Admin");
  const isOperador = roles.includes("Operador");
  const isAuditor = roles.includes("Auditor");

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin }).catch((e) => console.error(e));
  };

  const allNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, visible: true },
    { id: "appointments", label: "Atenciones", icon: Calendar, visible: true },
    { id: "catalog", label: "Catálogo", icon: BookOpen, visible: isAdmin },
    { id: "reports", label: "Reportería", icon: BarChart3, visible: isAdmin || isAuditor },
    { id: "audit", label: "Auditoría", icon: ShieldCheck, visible: isAdmin || isAuditor },
  ] as const;

  const visibleNavItems = allNavItems.filter((item) => item.visible);

  const handleNotificationClick = (targetView?: "dashboard" | "appointments") => {
    setCurrentView(targetView || "dashboard");
    setShowNotifications(false);
    closeToast();
  };

  return (
    <>
      <header className="bg-slate-900 text-white px-8 py-3.5 flex justify-between items-center shadow-lg sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView("dashboard")}>
            <div className="bg-emerald-500 p-2 rounded-xl shadow-md shadow-emerald-500/20">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg tracking-wide">
              VIDA<span className="text-emerald-400">SALUD</span>
            </span>
          </div>

          <nav className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewType)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Notificaciones de Eventos"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" /> Notificaciones del Sistema
                  </span>
                  {notifications.length > 0 && (
                    <button type="button" onClick={clearAll} className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Limpiar
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">Sin notificaciones recientes.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          handleNotificationClick(n.targetView);
                        }}
                        className={`p-3 text-xs flex justify-between items-start cursor-pointer hover:bg-slate-50 transition ${
                          !n.read ? "bg-emerald-50/60 font-semibold" : ""
                        }`}
                      >
                        <div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mb-1 ${
                            n.type === 'email' ? 'bg-blue-100 text-blue-700' :
                            n.type === 'admission' ? 'bg-purple-100 text-purple-700' :
                            n.type === 'record' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {n.type}
                          </span>
                          <p className="text-slate-900 font-bold">{n.title}</p>
                          <p className="text-slate-500 font-normal text-[11px] mt-0.5">{n.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">{n.timestamp}</span>
                        </div>
                        {!n.read && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col text-right">
            <span className="text-slate-300 font-medium">{account?.name || account?.username}</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">
              {isAdmin ? "Admin" : isOperador ? "Recepcionista" : isAuditor ? "Auditor" : "Paciente"}
            </span>
          </div>
        </div>
      </header>

      {/* POP-UP TOAST PUSH FLOTANTE CON CLIC DE NAVEGACIÓN */}
      {activeToast && (
        <div 
          onClick={() => handleNotificationClick(activeToast.targetView)}
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl max-w-sm w-full cursor-pointer hover:border-emerald-400 transition"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Bell className="w-4 h-4" /> {activeToast.title}
            </span>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeToast();
              }} 
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300">{activeToast.message}</p>
          <span className="text-[10px] text-slate-500 mt-2 block text-right">{activeToast.timestamp}</span>
        </div>
      )}
    </>
  );
};