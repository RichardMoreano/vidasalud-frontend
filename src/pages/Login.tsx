import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "../authConfig";
import { 
  HeartPulse, 
  KeyRound, 
  CheckCircle2, 
  Lock,
  LogOut,
  ArrowRight
} from "lucide-react";

// Recibimos una función por props para navegar al Dashboard
export const Login = ({ onEnterDashboard }: { onEnterDashboard?: () => void }) => {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = async () => {
    if (inProgress !== InteractionStatus.None) return;
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e: any) {
      console.error("Error al redirigir hacia MSAL:", e);
    }
  };

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    }).catch((e) => console.error("Error al cerrar sesión:", e));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
      
      {/* Barra Superior */}
      <header className="w-full bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-md shadow-emerald-500/20">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-none">
              VIDA<span className="text-emerald-600">SALUD</span>
            </span>
            <span className="text-xs font-medium text-slate-400">Portal de Gestión Médica</span>
          </div>
        </div>

        {/* Indicador de Estado Reactivo */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold">
          <span className={`w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-500'}`} />
          <span className="text-slate-600">
            {isAuthenticated ? 'Sesión Iniciada' : 'Sesión no iniciada'}
          </span>
        </div>
      </header>

      {/* Contenido Principal - Ahora centrado con Flexbox en lugar de Grid */}
      <main className="flex-1 flex flex-col items-center justify-center w-full px-6 py-12">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isAuthenticated ? "¡Autenticación Exitosa!" : "Acceso Institucional"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isAuthenticated 
                ? "Tu cuenta está conectada de forma segura." 
                : "Inicia sesión con tu cuenta Entra ID"}
            </p>
          </div>

          {/* Renderizado Condicional de Botones */}
          {isAuthenticated ? (
            <div className="space-y-3">
              <button
                onClick={onEnterDashboard}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                Ingresar al Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 py-3 px-6 rounded-2xl font-semibold text-sm transition-all border border-slate-200 hover:border-rose-200"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Acceso protegido por OAuth2 / OIDC</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Permisos asignados por rol médico</span>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={inProgress !== InteractionStatus.None}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-4 px-6 rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H1z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H1z"/>
                </svg>
                {inProgress !== InteractionStatus.None ? "Conectando..." : "Iniciar sesión con Microsoft"}
              </button>
            </>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-6 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Conexión cifrada de extremo a extremo
          </p>
        </div>
      </main>

      <footer className="w-full border-t border-slate-200 py-4 text-center text-xs text-slate-400 bg-white">
        Vida Salud © 2026 — Arquitectura Cloud-Native Spring Boot & React
      </footer>
    </div>
  );
};