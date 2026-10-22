import React, { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { api } from "../services/api";
import type { Appointment, EstadoAtencion, Prestacion } from "../services/api";
import { CalendarCheck, Plus } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export const Appointments = () => {
  const { accounts } = useMsal();
  const { addNotification } = useNotifications();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Prestacion[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  const [pacienteId, setPacienteId] = useState("");
  const [servicioId, setServicioId] = useState<number | "">("");
  const [boxId, setBoxId] = useState<number | "">("");

  const account = accounts[0];
  const roles = (account?.idTokenClaims?.roles as string[]) || [];
  const isAdmin = roles.includes("Admin");
  const isOperador = roles.includes("Operador");
  const currentUserId = account?.username || "paciente-anon";

  useEffect(() => {
    api.getServices().then(setServices).catch(console.error);
  }, []);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const appData = await api.getAppointments(filterStatus !== "TODOS" ? (filterStatus as EstadoAtencion) : undefined);
      setAppointments(appData);
    } catch (err) {
      console.error("Error al cargar atenciones:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      loadData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicioId) return;

    const finalPacienteId = pacienteId.trim() !== "" ? pacienteId.trim() : currentUserId;

    try {
      await api.createAppointment({
        pacienteId: finalPacienteId,
        servicioId: Number(servicioId),
        boxId: boxId ? Number(boxId) : undefined,
      });

      addNotification({
        type: "email",
        title: "Solicitud Registrada",
        message: `Solicitud creada para ${finalPacienteId}.`,
        targetView: "dashboard",
      });

      setShowModal(false);
      setPacienteId("");
      setServicioId("");
      setBoxId("");
      loadData(false);
    } catch (err: any) {
      alert("Error al agendar atención: " + err.message);
    }
  };

  const handleStatusChange = async (id: number, currentStatus: EstadoAtencion, newStatus: EstadoAtencion) => {
    if (newStatus === "EN_ATENCION" && !["CONFIRMADA", "EN_ESPERA"].includes(currentStatus)) {
      alert("Regla de negocio: La atención debe estar 'CONFIRMADA' o 'EN_ESPERA' antes de pasar a 'EN_ATENCION'.");
      return;
    }

    try {
      await api.updateAppointmentStatus(id, newStatus);
      loadData(false);
    } catch (err: any) {
      alert("Error al cambiar estado: " + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-emerald-600" /> Gestión de Atenciones
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Coordinación de citas clínicas y flujo de llegada del paciente
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-md"
        >
          <Plus className="w-4 h-4" /> Solicitar Nueva Atención
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {["TODOS", "SOLICITADA", "CONFIRMADA", "EN_ESPERA", "EN_ATENCION", "CERRADA", "CANCELADA"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filterStatus === st
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando atenciones...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No se encontraron atenciones registradas.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">ID / Paciente</th>
                <th className="p-4">Servicio / Box</th>
                <th className="p-4">Fecha Solicitud</th>
                <th className="p-4">Estado Actual</th>
                <th className="p-4 text-right">Acciones de Flujo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {appointments.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4">
                    <span className="font-mono text-slate-400">#{app.id}</span>
                    <p className="font-bold text-slate-800">{app.pacienteId}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-700">
                      {services.find((s) => s.id === app.servicioId)?.nombre || `Servicio #${app.servicioId}`}
                    </p>
                    <span className="text-[11px] text-slate-400">Box: {app.boxId || "Sin Asignar"}</span>
                  </td>
                  <td className="p-4 text-slate-500">
                    {app.fechaSolicitud ? new Date(app.fechaSolicitud).toLocaleString("es-CL") : "N/A"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        app.estado === "SOLICITADA"
                          ? "bg-amber-100 text-amber-700"
                          : app.estado === "CONFIRMADA"
                          ? "bg-blue-100 text-blue-700"
                          : app.estado === "EN_ESPERA"
                          ? "bg-purple-100 text-purple-700"
                          : app.estado === "EN_ATENCION"
                          ? "bg-emerald-100 text-emerald-700"
                          : app.estado === "CERRADA"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {app.estado}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    {!isAdmin && !isOperador && app.estado !== "CERRADA" && app.estado !== "CANCELADA" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(app.id!, app.estado, "CANCELADA")}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-[11px]"
                      >
                        Cancelar
                      </button>
                    )}

                    {(isOperador || isAdmin) && (
                      <>
                        {app.estado === "SOLICITADA" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(app.id!, app.estado, "CONFIRMADA")}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px]"
                          >
                            Confirmar
                          </button>
                        )}
                        {app.estado === "CONFIRMADA" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(app.id!, app.estado, "EN_ESPERA")}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold text-[11px]"
                          >
                            Anunciar
                          </button>
                        )}
                        {(app.estado === "CONFIRMADA" || app.estado === "EN_ESPERA") && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(app.id!, app.estado, "EN_ATENCION")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold text-[11px]"
                          >
                            Llamar a Box
                          </button>
                        )}
                        {app.estado === "EN_ATENCION" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(app.id!, app.estado, "CERRADA")}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px]"
                          >
                            Finalizar
                          </button>
                        )}
                        {app.estado !== "CERRADA" && app.estado !== "CANCELADA" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(app.id!, app.estado, "CANCELADA")}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-[11px]"
                          >
                            Cancelar
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Agendar Atención Médica</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  RUT / ID Paciente (Opcional - por defecto tu usuario)
                </label>
                <input
                  type="text"
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  placeholder={`Ej: ${currentUserId}`}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prestación / Servicio</label>
                <select
                  value={servicioId}
                  onChange={(e) => setServicioId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                  required
                >
                  <option value="">Seleccione una prestación...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} - ${s.precio.toLocaleString("es-CL")} (Cupos: {s.cupoDisponible})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Box Preferente (Opcional)</label>
                <input
                  type="number"
                  value={boxId}
                  onChange={(e) => setBoxId(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ej: 4"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold shadow-md"
                >
                  Crear Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};