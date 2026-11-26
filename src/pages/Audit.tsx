// src/pages/Audit.tsx
// Timeline de auditoría (solo lectura, Admin / Auditor). Se construye con los datos reales de
// ms-vidasalud-appointments y muestra, para cada cita, la key Kafka y la partición de vidasalud.citas
// donde quedan sus eventos (el consumidor de auditoría es el grupo vidasalud-notify).
import { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { ShieldCheck, Search, Filter, History, RefreshCw, Radio } from "lucide-react";
import { api, errorMessage } from "../services/api";
import type { Appointment, EstadoAtencion, Prestacion } from "../services/api";
import { appointmentKey, partitionForKey } from "../services/kafkaApi";
import { useKafkaPipeline } from "../hooks/useKafkaPipeline";

type EventType = "SOLICITUD" | "LLAMADO_A_BOX" | "ESTADO_ACTUAL";

interface AuditEvent {
  id: string;
  appointmentId: number;
  fecha: Date | null;
  actor: string;
  tipo: EventType;
  estado: EstadoAtencion;
  detalle: string;
  key: string;
}

const TIPO_LABEL: Record<EventType, string> = {
  SOLICITUD: "Solicitud de atención",
  LLAMADO_A_BOX: "Llamado a box",
  ESTADO_ACTUAL: "Último cambio de estado",
};

const TIPO_CLASS: Record<EventType, string> = {
  SOLICITUD: "bg-amber-100 text-amber-700 border-amber-200",
  LLAMADO_A_BOX: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ESTADO_ACTUAL: "bg-slate-100 text-slate-700 border-slate-200",
};

/** Partición por defecto de vidasalud.citas si no se puede consultar el admin de Kafka (README backend). */
const DEFAULT_CITAS_PARTITIONS = 3;

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

export const Audit = () => {
  const { accounts } = useMsal();
  const roles = (accounts[0]?.idTokenClaims?.roles as string[]) || [];
  const isAdmin = roles.includes("Admin");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<EventType | "TODOS">("TODOS");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const kafka = useKafkaPipeline(isAdmin, 15000);
  const partitions = kafka.citasTopic?.partitions ?? DEFAULT_CITAS_PARTITIONS;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [apps, svcs] = await Promise.all([api.getAppointments(), api.getServices().catch(() => [] as Prestacion[])]);
      setAppointments(apps || []);
      setServices(svcs || []);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 10000);
    return () => clearInterval(id);
  }, []);

  const events = useMemo<AuditEvent[]>(() => {
    const serviceName = (id: number) => services.find((s) => s.id === id)?.nombre ?? `Servicio #${id}`;
    const list: AuditEvent[] = [];

    appointments.forEach((a) => {
      if (a.id === undefined) return;
      const key = appointmentKey(a.id);
      if (a.fechaSolicitud) {
        list.push({
          id: `${a.id}-sol`,
          appointmentId: a.id,
          fecha: new Date(a.fechaSolicitud),
          actor: a.pacienteId,
          tipo: "SOLICITUD",
          estado: "SOLICITADA",
          detalle: `Solicitó ${serviceName(a.servicioId)}${a.boxId ? ` (box preferente #${a.boxId})` : ""}`,
          key,
        });
      }
      if (a.fechaAtencion) {
        list.push({
          id: `${a.id}-box`,
          appointmentId: a.id,
          fecha: new Date(a.fechaAtencion),
          actor: "Recepción (Operador/Admin)",
          tipo: "LLAMADO_A_BOX",
          estado: "EN_ATENCION",
          detalle: `Paciente ${a.pacienteId} llamado a ${a.boxId ? `box #${a.boxId}` : "box"}`,
          key,
        });
      }
      if (a.estado !== "SOLICITADA" && a.estado !== "EN_ATENCION") {
        list.push({
          id: `${a.id}-cur`,
          appointmentId: a.id,
          fecha: null,
          actor: "Recepción (Operador/Admin)",
          tipo: "ESTADO_ACTUAL",
          estado: a.estado,
          detalle: `Atención #${a.id} quedó en ${a.estado}`,
          key,
        });
      }
    });

    // Más recientes primero; los eventos sin marca temporal van junto a su cita.
    const sortTime = (e: AuditEvent) =>
      e.fecha?.getTime() ??
      Math.max(
        ...list.filter((x) => x.appointmentId === e.appointmentId && x.fecha).map((x) => x.fecha!.getTime()),
        0
      ) + 1;
    return list.sort((a, b) => sortTime(b) - sortTime(a));
  }, [appointments, services]);

  const filtered = events.filter((e) => {
    const q = search.trim().toLowerCase();
    if (q && !`${e.actor} ${e.detalle} #${e.appointmentId}`.toLowerCase().includes(q)) return false;
    if (tipo !== "TODOS" && e.tipo !== tipo) return false;
    if (from && (!e.fecha || toInputDate(e.fecha) < from)) return false;
    if (to && (!e.fecha || toInputDate(e.fecha) > to)) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600" /> Bitácora & Timeline de Auditoría
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Trazabilidad de cada atención. Los eventos se publican en el tópico Kafka vidasalud.citas (key cita-&#123;id&#125;)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200">
            Solo Lectura
          </span>
          <button
            type="button"
            onClick={() => {
              load();
              kafka.refresh();
            }}
            title="Recargar"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          No se pudo obtener la información de atenciones: {error}
        </div>
      )}

      {/* Estado del consumidor de auditoría */}
      {kafka.status === "ok" && kafka.citas && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Consumidor de auditoría</p>
              <p className="font-mono font-bold text-slate-800">
                {kafka.citas.group} · {kafka.citas.groupState} · {kafka.citas.members} miembro(s)
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap md:ml-auto">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
              Eventos en tópico: {kafka.citas.published}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 font-bold text-emerald-700">
              Auditados: {kafka.citas.consumed}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-bold ${
                kafka.citas.lag > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              Pendientes (lag): {kafka.citas.lag}
            </span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Usuario, paciente o #cita"
            className="w-full pl-9 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as EventType | "TODOS")}
            className="w-full pl-9 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
          >
            <option value="TODOS">Todos los eventos</option>
            {(Object.keys(TIPO_LABEL) as EventType[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="Desde"
          className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="Hasta"
          className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
        />
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <History className="w-4 h-4" /> {filtered.length} de {events.length} eventos
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Cargando timeline...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No hay eventos que coincidan con los filtros.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Marca Temporal</th>
                <th className="p-4">Usuario / Actor</th>
                <th className="p-4">Evento / Acción</th>
                <th className="p-4">Detalle Trazable</th>
                <th className="p-4">Kafka (key · partición)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 text-slate-400 font-mono">
                    {ev.fecha ? ev.fecha.toLocaleString("es-CL") : "—"}
                  </td>
                  <td className="p-4 font-bold text-slate-800">{ev.actor}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 font-semibold text-[10px] rounded-md border ${TIPO_CLASS[ev.tipo]}`}>
                      {ev.tipo === "ESTADO_ACTUAL" ? ev.estado : ev.tipo}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{ev.detalle}</td>
                  <td className="p-4 font-mono text-[11px] text-indigo-700">
                    {ev.key} · P{partitionForKey(ev.key, partitions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        La partición se calcula igual que el productor Kafka (murmur2(key) % {partitions} particiones): todos los eventos de una
        misma cita van a la misma partición y se consumen en orden.
      </p>
    </div>
  );
};
