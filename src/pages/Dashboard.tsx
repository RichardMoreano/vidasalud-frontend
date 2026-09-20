import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { 
  Users, 
  CalendarCheck, 
  Activity, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  ShieldAlert,
  UserCheck,
  LogOut,
  RefreshCw,
  AlertCircle
} from "lucide-react";

import { api } from "../services/api";
import type { Appointment, Prestacion, EstadoAtencion } from "../services/api";

export const Dashboard = () => {
  const { accounts, instance } = useMsal();
  const userName = accounts[0]?.name || "Usuario VidaSalud";
  const userSubOrId = accounts[0]?.username || accounts[0]?.localAccountId || "";

  const [role, setRole] = useState<"ADMIN" | "RECEPCIONISTA" | "PACIENTE">("ADMIN");

  // --- ESTADOS PARA DATOS REALES DE MICROSERVICIOS ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- CARGA DE DATOS DESDE LA API ---
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appointmentsData, servicesData] = await Promise.all([
        api.getAppointments(),
        api.getServices().catch(() => [] as Prestacion[]) // Respaldo si el catálogo falla
      ]);
      setAppointments(appointmentsData || []);
      setServices(servicesData || []);
    } catch (err: any) {
      console.error("Error al cargar datos del microservicio:", err);
      setError("No se pudieron obtener los datos actualizados del microservicio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- ACCIÓN: CAMBIAR ESTADO EN MICROSERVICIO ---
  const handleUpdateStatus = async (id: number, newStatus: EstadoAtencion) => {
    try {
      await api.updateAppointmentStatus(id, newStatus);
      // Actualizamos estado local sin necesidad de recargar todo
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, estado: newStatus } : app))
      );
    } catch (err) {
      alert("Error al actualizar el estado de la atención en el microservicio.");
    }
  };

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    }).catch((e) => console.error("Error al cerrar sesión:", e));
  };

  // --- CÁLCULO DE KPIs CON DATOS REALES ---
  const totalAppointments = appointments.length;
  const enEsperaList = appointments.filter((a) => a.estado === "EN_ESPERA" || a.estado === "SOLICITADA");
  const enAtencionCount = appointments.filter((a) => a.estado === "EN_ATENCION").length;
  const canceladasCount = appointments.filter((a) => a.estado === "CANCELADA").length;
  
  const porcentajeCancelacion = totalAppointments > 0 
    ? ((canceladasCount / totalAppointments) * 100).toFixed(1) 
    : "0.0";

  // Mis atenciones (Vista Paciente)
  const myAppointments = appointments.filter(
    (a) => a.pacienteId === userSubOrId || a.pacienteId === accounts[0]?.username
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Cabecera del Dashboard */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">¡Hola, {userName}! 👋</h1>
          <p className="text-sm text-slate-500 mt-1">Panel de Control de Atenciones Médicas — Ecosistema VidaSalud</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Switcher de Rol */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 px-2">Vista Rol:</span>
            {(["ADMIN", "RECEPCIONISTA", "PACIENTE"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === r 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button 
            onClick={fetchDashboardData}
            title="Recargar datos"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Botón de Cerrar Sesión */}
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200 w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VISTA 1: ADMINISTRADOR (KPIs Calculados Dinámicamente) */}
      {role === "ADMIN" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> KPIs de Operación Clínica (Tiempo Real)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 mb-2">
                <span className="text-xs font-medium">Total Atenciones</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {loading ? "..." : totalAppointments}
              </p>
              <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">Registradas en MS</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 mb-2">
                <span className="text-xs font-medium">En Atención Actual</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {loading ? "..." : enAtencionCount}
              </p>
              <span className="text-xs text-slate-400 mt-1 inline-block">Pacientes en box</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 mb-2">
                <span className="text-xs font-medium">Servicios Activos</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {loading ? "..." : services.length}
              </p>
              <span className="text-xs text-amber-600 font-semibold mt-1 inline-block">Catálogo disponible</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-slate-500 mb-2">
                <span className="text-xs font-medium">Tasa Cancelaciones</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">
                {loading ? "..." : `${porcentajeCancelacion}%`}
              </p>
              <span className="text-xs text-rose-600 font-semibold mt-1 inline-block">{canceladasCount} citas canceladas</span>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: RECEPCIONISTA (Pacientes filtrados del MS) */}
      {role === "RECEPCIONISTA" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> Sala de Espera y Recepción
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">
                Pacientes Pendientes / En Espera ({enEsperaList.length})
              </h3>

              {loading ? (
                <p className="text-xs text-slate-400">Cargando lista del microservicio...</p>
              ) : enEsperaList.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No hay pacientes esperando en este momento.</p>
              ) : (
                <div className="space-y-3">
                  {enEsperaList.map((app) => (
                    <div key={app.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Paciente ID: {app.pacienteId}</p>
                        <p className="text-slate-400">Cita #{app.id} — Servicio ID: {app.servicioId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-700 font-semibold">
                          {app.estado}
                        </span>
                        {app.id && (
                          <button
                            onClick={() => handleUpdateStatus(app.id!, "EN_ATENCION")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition"
                          >
                            Ingresar a Box
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Acciones Rápidas</h3>
              <p className="text-xs text-slate-500 mb-4">Los cambios de estado se sincronizan con AWS API Gateway.</p>
              <div className="space-y-2">
                <button 
                  onClick={fetchDashboardData} 
                  className="w-full text-left p-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 hover:bg-blue-100 transition"
                >
                  ↻ Sincronizar Citas del Sistema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: PACIENTE (Citas reales del usuario activo) */}
      {role === "PACIENTE" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" /> Mis Próximas Atenciones
          </h2>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
            {loading ? (
              <p className="text-xs text-slate-400">Consultando atenciones asociadas...</p>
            ) : myAppointments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-slate-700">No tienes atenciones agendadas.</p>
                <p className="text-xs text-slate-400 mt-1">Usa el menú de atenciones para solicitar una nueva hora.</p>
              </div>
            ) : (
              myAppointments.map((app) => (
                <div key={app.id} className="border-b border-slate-100 pb-4 mb-4 last:border-b-0 last:mb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 mb-2">
                        {app.estado}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900">Atención #{app.id}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Servicio asignado #{app.servicioId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{app.fechaSolicitud || "Fecha no registrada"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 my-4">
                    <div>
                      <span className="font-semibold block text-slate-800">Box Asignado:</span>
                      <span>{app.boxId ? `Box #${app.boxId}` : "Sin box asignado"}</span>
                    </div>
                    <div>
                      <span className="font-semibold block text-slate-800">Estado en Sala:</span>
                      <span className="text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3" /> {app.estado}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};