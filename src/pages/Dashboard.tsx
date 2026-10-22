import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { 
  Users, 
  CalendarCheck, 
  Activity, 
  Clock, 
  TrendingUp, 
  ShieldAlert,
  UserCheck,
  LogOut,
  RefreshCw,
  AlertCircle,
  Stethoscope,
  Building2,
  CheckCircle2
} from "lucide-react";

import { api } from "../services/api";
import type { Appointment, Prestacion, EstadoAtencion } from "../services/api";

type RoleView = "ADMIN" | "RECEPCIONISTA" | "PACIENTE";

export const Dashboard = () => {
  const { accounts, instance } = useMsal();
  const account = accounts[0];
  const userName = account?.name || "Usuario VidaSalud";
  const userSubOrId = account?.username || account?.localAccountId || "paciente-anon";

  const roles = (account?.idTokenClaims?.roles as string[]) || [];
  const isAdmin = roles.includes("Admin");
  const isOperador = roles.includes("Operador");

  const defaultRole: RoleView = isAdmin
    ? "ADMIN"
    : isOperador
    ? "RECEPCIONISTA"
    : "PACIENTE";

  const [role, setRole] = useState<RoleView>(defaultRole);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRole(defaultRole);
  }, [account]);

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [appointmentsData, servicesData] = await Promise.all([
        api.getAppointments(),
        api.getServices().catch(() => [] as Prestacion[])
      ]);
      setAppointments(appointmentsData || []);
      setServices(servicesData || []);
    } catch (err: any) {
      console.error("Error al cargar datos del microservicio:", err);
      if (!isSilent) setError("No se pudieron obtener los datos actualizados del microservicio.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: number, newStatus: EstadoAtencion) => {
    try {
      await api.updateAppointmentStatus(id, newStatus);
      setAppointments((prev) =>
        prev.map((app) => (app.id === id ? { ...app, estado: newStatus } : app))
      );
    } catch (err) {
      alert("Error al actualizar el estado de la atención.");
    }
  };

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    }).catch((e) => console.error("Error al cerrar sesión:", e));
  };

  const totalAppointments = appointments.length;
  const pendientesOperador = appointments.filter((a) => a.estado !== "CERRADA" && a.estado !== "CANCELADA");
  const enAtencionCount = appointments.filter((a) => a.estado === "EN_ATENCION").length;
  const canceladasCount = appointments.filter((a) => a.estado === "CANCELADA").length;
  
  const porcentajeCancelacion = totalAppointments > 0 
    ? ((canceladasCount / totalAppointments) * 100).toFixed(1) 
    : "0.0";

  const myAppointments = appointments.filter(
    (a) => (a.pacienteId || "").toLowerCase() === userSubOrId.toLowerCase()
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">¡Hola, {userName}! 👋</h1>
          <p className="text-xs text-slate-500 mt-1">Panel de Control de Atenciones Médicas — Ecosistema VidaSalud</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* CONTROL DE ROL EXCLUSIVO DE ADMIN */}
          {isAdmin && (
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 px-2">Vista Rol:</span>
              {(["ADMIN", "RECEPCIONISTA", "PACIENTE"] as const).map((r) => (
                <button
                  type="button"
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
          )}

          <button 
            type="button"
            onClick={() => fetchDashboardData(false)}
            title="Recargar datos"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button 
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200 w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VISTA ADMIN */}
      {role === "ADMIN" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> KPIs de Operación Clínica (Tiempo Real)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Atenciones</p>
                <p className="text-2xl font-black text-slate-900">{loading ? "..." : totalAppointments}</p>
                <span className="text-[10px] text-emerald-600 font-semibold">Registradas en MS</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">En Atención Actual</p>
                <p className="text-2xl font-black text-slate-900">{loading ? "..." : enAtencionCount}</p>
                <span className="text-[10px] text-slate-400">Pacientes en box</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Servicios Activos</p>
                <p className="text-2xl font-black text-slate-900">{loading ? "..." : services.length}</p>
                <span className="text-[10px] text-amber-600 font-semibold">Catálogo disponible</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tasa Cancelaciones</p>
                <p className="text-2xl font-black text-slate-900">{loading ? "..." : `${porcentajeCancelacion}%`}</p>
                <span className="text-[10px] text-rose-600 font-semibold">{canceladasCount} citas canceladas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA RECEPCIONISTA (TODAS LAS ACCIONES DISPONIBLES) */}
      {role === "RECEPCIONISTA" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> Sala de Espera y Recepción
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-wide">
                Pacientes Activos ({pendientesOperador.length})
              </h3>

              {loading ? (
                <p className="text-xs text-slate-400">Cargando lista del microservicio...</p>
              ) : pendientesOperador.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No hay pacientes activos en este momento.</p>
              ) : (
                <div className="space-y-3">
                  {pendientesOperador.map((app) => (
                    <div key={app.id} className="flex justify-between items-center p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Paciente: {app.pacienteId}</p>
                        <p className="text-slate-500 font-medium mt-0.5">
                          Cita #{app.id} — {services.find((s) => s.id === app.servicioId)?.nombre || `Servicio #${app.servicioId}`}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Box: {app.boxId || "Sin Asignar"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          app.estado === "SOLICITADA" ? "bg-amber-100 text-amber-700" :
                          app.estado === "CONFIRMADA" ? "bg-blue-100 text-blue-700" :
                          app.estado === "EN_ESPERA" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {app.estado}
                        </span>

                        {app.id && app.estado === "SOLICITADA" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(app.id!, "CONFIRMADA")}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                          >
                            Confirmar Cita
                          </button>
                        )}
                        {app.id && app.estado === "CONFIRMADA" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(app.id!, "EN_ESPERA")}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition"
                          >
                            Anunciar
                          </button>
                        )}
                        {app.id && (app.estado === "CONFIRMADA" || app.estado === "EN_ESPERA") && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(app.id!, "EN_ATENCION")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition"
                          >
                            Llamar a Box
                          </button>
                        )}
                        {app.id && app.estado !== "CERRADA" && app.estado !== "CANCELADA" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(app.id!, "CANCELADA")}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold transition border border-rose-200"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-wide">Acciones Rápidas</h3>
              <p className="text-xs text-slate-500 mb-4">Sincronización en tiempo real con los microservicios.</p>
              <div className="space-y-2">
                <button 
                  type="button"
                  onClick={() => fetchDashboardData(false)} 
                  className="w-full text-left p-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 hover:bg-blue-100 transition flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar Citas del Sistema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PACIENTE */}
      {role === "PACIENTE" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" /> Mis Próximas Atenciones
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Mis Citas Agendadas</p>
                <p className="text-2xl font-black text-slate-900">{myAppointments.length}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Atenciones Finalizadas</p>
                <p className="text-2xl font-black text-slate-900">
                  {myAppointments.filter((a) => a.estado === "CERRADA").length}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">En Proceso / Espera</p>
                <p className="text-2xl font-black text-slate-900">
                  {myAppointments.filter((a) => ["SOLICITADA", "CONFIRMADA", "EN_ESPERA", "EN_ATENCION"].includes(a.estado)).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            {loading ? (
              <p className="text-xs text-slate-400">Consultando atenciones asociadas...</p>
            ) : myAppointments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-slate-700">No tienes atenciones agendadas.</p>
                <p className="text-xs text-slate-400 mt-1">Usa el menú de atenciones para solicitar una nueva hora.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myAppointments.map((app) => (
                  <div key={app.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mb-2 ${
                          app.estado === "SOLICITADA" ? "bg-amber-100 text-amber-700" :
                          app.estado === "CONFIRMADA" ? "bg-blue-100 text-blue-700" :
                          app.estado === "EN_ESPERA" ? "bg-purple-100 text-purple-700" :
                          app.estado === "EN_ATENCION" ? "bg-emerald-100 text-emerald-700 font-black animate-pulse" :
                          app.estado === "CERRADA" ? "bg-slate-100 text-slate-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {app.estado}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {services.find((s) => s.id === app.servicioId)?.nombre || `Atención #${app.id}`}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Cita #{app.id} — Box: {app.boxId ? `Box #${app.boxId}` : "Sin box asignado"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          {app.fechaSolicitud ? new Date(app.fechaSolicitud).toLocaleString("es-CL") : "Fecha N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};