// src/pages/Reports.tsx
// Reportería: métricas operacionales calculadas con datos reales de ms-vidasalud-appointments
// y estado del pipeline de streaming Kafka (publicados / consumidos / lag por partición).
import { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { BarChart3, TrendingUp, Clock, Activity, RefreshCw, Radio, ShieldAlert, Lock } from "lucide-react";
import { api, errorMessage } from "../services/api";
import type { Appointment, EstadoAtencion, Prestacion } from "../services/api";
import { useKafkaPipeline } from "../hooks/useKafkaPipeline";
import type { TopicFlowStats } from "../hooks/useKafkaPipeline";
import { formatRetention } from "../services/kafkaApi";

const ESTADOS: { estado: EstadoAtencion; color: string }[] = [
  { estado: "SOLICITADA", color: "bg-amber-500" },
  { estado: "CONFIRMADA", color: "bg-blue-500" },
  { estado: "EN_ESPERA", color: "bg-purple-500" },
  { estado: "EN_ATENCION", color: "bg-emerald-500" },
  { estado: "CERRADA", color: "bg-slate-500" },
  { estado: "CANCELADA", color: "bg-rose-500" },
];

/** Misma regla que ms-vidasalud-streams (vidasalud.streams.umbral-cancelaciones). */
const UMBRAL_CANCELACIONES = 3;

const FlowCard = ({ title, flow, subtitle }: { title: string; flow: TopicFlowStats | null; subtitle: string }) => {
  const max = Math.max(1, ...(flow?.partitions.map((p) => p.published) ?? [1]));
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-bold text-slate-800 font-mono">{title}</h3>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-md text-[10px] font-bold ${
            flow?.groupState?.toUpperCase() === "STABLE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {flow?.group} · {flow?.groupState}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          ["Publicados", flow?.published ?? 0, "text-slate-900"],
          ["Consumidos", flow?.consumed ?? 0, "text-emerald-600"],
          ["Lag", flow?.lag ?? 0, (flow?.lag ?? 0) > 0 ? "text-amber-600" : "text-slate-900"],
        ].map(([label, value, cls]) => (
          <div key={label as string} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
            <p className={`text-xl font-black ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Mensajes por partición</p>
        {flow && flow.partitions.length > 0 ? (
          <div className="space-y-2">
            {flow.partitions.map((p) => (
              <div key={p.partition} className="flex items-center gap-3 text-[11px]">
                <span className="w-10 font-mono font-bold text-slate-500">P{p.partition}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                  <div className="h-full bg-indigo-200 absolute" style={{ width: `${(p.published / max) * 100}%` }} />
                  <div className="h-full bg-indigo-500 absolute" style={{ width: `${(p.consumed / max) * 100}%` }} />
                </div>
                <span className="w-24 text-right font-mono text-slate-600">
                  {p.consumed}/{p.published}
                  {p.lag > 0 && <span className="text-amber-600"> (+{p.lag})</span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Sin offsets confirmados todavía.</p>
        )}
      </div>
    </div>
  );
};

export const Reports = () => {
  const { accounts } = useMsal();
  const roles = (accounts[0]?.idTokenClaims?.roles as string[]) || [];
  const isAdmin = roles.includes("Admin");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Prestacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const kafka = useKafkaPipeline(isAdmin);

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

  const metrics = useMemo(() => {
    const total = appointments.length;
    const byEstado = Object.fromEntries(ESTADOS.map(({ estado }) => [estado, 0])) as Record<EstadoAtencion, number>;
    appointments.forEach((a) => (byEstado[a.estado] = (byEstado[a.estado] ?? 0) + 1));

    // Tiempo medio de espera: desde la solicitud hasta que pasa a EN_ATENCION (fechaAtencion).
    const waits = appointments
      .filter((a) => a.fechaSolicitud && a.fechaAtencion)
      .map((a) => (new Date(a.fechaAtencion!).getTime() - new Date(a.fechaSolicitud!).getTime()) / 60000)
      .filter((m) => m >= 0);
    const avgWait = waits.length ? waits.reduce((s, m) => s + m, 0) / waits.length : null;

    // Prestación más demandada
    const byService = new Map<number, number>();
    appointments.forEach((a) => byService.set(a.servicioId, (byService.get(a.servicioId) ?? 0) + 1));
    const top = [...byService.entries()].sort((a, b) => b[1] - a[1])[0];
    const topName = top ? services.find((s) => s.id === top[0])?.nombre ?? `Servicio #${top[0]}` : null;

    // Solicitudes por hora del día
    const byHour = Array.from({ length: 24 }, () => 0);
    appointments.forEach((a) => {
      if (a.fechaSolicitud) byHour[new Date(a.fechaSolicitud).getHours()]++;
    });
    const usedHours = byHour.map((v, h) => ({ h, v })).filter((x) => x.v > 0);
    const from = usedHours.length ? Math.min(...usedHours.map((x) => x.h)) : 8;
    const to = usedHours.length ? Math.max(...usedHours.map((x) => x.h)) : 17;
    const hours = byHour.slice(from, Math.max(to, from + 5) + 1).map((v, i) => ({ hour: from + i, value: v }));
    const peak = usedHours.sort((a, b) => b.v - a.v)[0];

    // Pacientes con cancelaciones reiteradas (misma regla que la topología de Kafka Streams)
    const cancelByPatient = new Map<string, number>();
    appointments
      .filter((a) => a.estado === "CANCELADA")
      .forEach((a) => cancelByPatient.set(a.pacienteId, (cancelByPatient.get(a.pacienteId) ?? 0) + 1));
    const alertPatients = [...cancelByPatient.entries()]
      .filter(([, n]) => n >= UMBRAL_CANCELACIONES)
      .sort((a, b) => b[1] - a[1]);

    return { total, byEstado, avgWait, waitsCount: waits.length, top, topName, hours, peak, alertPatients };
  }, [appointments, services]);

  const maxHour = Math.max(1, ...metrics.hours.map((h) => h.value));
  const pipelineActive = kafka.status === "ok";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" /> Panel de Análitica & Reportería Kafka
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Métricas operacionales (ms-vidasalud-appointments) y estado del streaming de eventos (vidasalud.citas / vidasalud.alertas)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              pipelineActive
                ? "bg-emerald-100 text-emerald-700 animate-pulse"
                : kafka.status === "forbidden"
                ? "bg-slate-100 text-slate-500"
                : kafka.status === "loading"
                ? "bg-slate-100 text-slate-500"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {pipelineActive
              ? "Kafka Pipeline Activo"
              : kafka.status === "forbidden"
              ? "Kafka: solo Admin"
              : kafka.status === "loading"
              ? "Consultando Kafka..."
              : "Kafka no disponible"}
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
          No se pudieron obtener las atenciones: {error}
        </div>
      )}

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Atenciones Registradas</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{loading ? "..." : metrics.total}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {metrics.peak ? `Pico: ${metrics.peak.v} solicitudes a las ${metrics.peak.h}:00` : "Sin solicitudes aún"}
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Tiempo Medio de Espera</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {loading ? "..." : metrics.avgWait === null ? "—" : `${metrics.avgWait.toFixed(1)} min`}
          </p>
          <span className="text-[11px] text-slate-400">
            Solicitud → llamado a box ({metrics.waitsCount} atenciones con llamado)
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Prestación Más Demandada</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 truncate">{loading ? "..." : metrics.topName ?? "—"}</p>
          <span className="text-[11px] text-slate-400">{metrics.top ? `${metrics.top[1]} atenciones solicitadas` : "Sin datos"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distribución por hora */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Distribución de Solicitudes por Hora</h3>
          <div className="h-48 flex items-end gap-3 pt-6 border-b border-slate-100">
            {metrics.hours.map(({ hour, value }) => (
              <div key={hour} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
                <div
                  style={{ height: `${(value / maxHour) * 100}%`, minHeight: value > 0 ? "4px" : "0" }}
                  className="w-full bg-indigo-500 rounded-t-lg group-hover:bg-indigo-600 transition-all relative"
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-bold">
                    {value}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{hour}:00</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución por estado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Atenciones por Estado</h3>
          {ESTADOS.map(({ estado, color }) => {
            const n = metrics.byEstado[estado] ?? 0;
            const pct = metrics.total ? (n / metrics.total) * 100 : 0;
            return (
              <div key={estado} className="text-[11px]">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-slate-600">{estado}</span>
                  <span className="text-slate-400">
                    {n} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Kafka */}
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Radio className="w-5 h-5 text-indigo-600" /> Streaming de Eventos (Kafka)
      </h2>

      {kafka.status === "forbidden" ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-500 flex items-center gap-3">
          <Lock className="w-5 h-5 text-slate-400" />
          Las métricas de offsets y consumer groups provienen de ms-vidasalud-kafka-admin y requieren rol Admin.
        </div>
      ) : kafka.status === "error" ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          No se pudo leer el pipeline Kafka: {kafka.error}
        </div>
      ) : (
        <>
          {kafka.citasTopic && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                ["Particiones", kafka.citasTopic.partitions],
                ["Factor replicación", kafka.citasTopic.replicationFactor],
                ["Retención", formatRetention(kafka.citasTopic.configs["retention.ms"])],
                ["min.insync.replicas", kafka.citasTopic.configs["min.insync.replicas"] ?? "—"],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{label} · vidasalud.citas</p>
                  <p className="text-lg font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FlowCard
              title="vidasalud.citas"
              subtitle="Productor: ms-vidasalud-appointments · Consumidor: auditoría en ms-vidasalud-notify"
              flow={kafka.citas}
            />
            <FlowCard
              title="vidasalud.alertas"
              subtitle="Productor: ms-vidasalud-streams · Consumidor: alertas en ms-vidasalud-notify"
              flow={kafka.alertas}
            />
          </div>
        </>
      )}

      {/* Pacientes en alerta */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" /> Pacientes con cancelaciones reiteradas (≥ {UMBRAL_CANCELACIONES})
        </h3>
        <p className="text-[11px] text-slate-400">
          Misma regla que aplica la topología de Kafka Streams para publicar en vidasalud.alertas.
        </p>
        {metrics.alertPatients.length === 0 ? (
          <p className="text-xs text-slate-400">Ningún paciente supera el umbral.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {metrics.alertPatients.map(([paciente, n]) => (
              <span key={paciente} className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {paciente} · {n} cancelaciones
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
