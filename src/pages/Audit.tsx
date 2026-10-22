// src/pages/Audit.tsx
import { ShieldCheck, Search, Filter, History } from "lucide-react";

export const Audit = () => {
  const events = [
    { id: 101, actor: "recepcion.centronorte", accion: "CAMBIO_ESTADO", detalle: "Atención #41 pasó de SOLICITADA a CONFIRMADA", fecha: "2026-03-29 11:20:14" },
    { id: 102, actor: "paciente.18765432-1", accion: "CREAR_ATENCION", detalle: "Solicitud de cita para Consulta Odontológica", fecha: "2026-03-29 11:15:02" },
    { id: 103, actor: "admin.vidasalud", accion: "MODIFICAR_PRESTACION", detalle: "Aumento de cupos en Box #02 (Prestación Cardiología)", fecha: "2026-03-29 10:45:00" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600" /> Bitácora & Timeline de Auditoría
          </h1>
          <p className="text-xs text-slate-500 mt-1">Registro inmutable de trazabilidad (Tópico audit.timeline)</p>
        </div>
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200">
          Solo Lectura
        </span>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Marca Temporal</th>
              <th className="p-4">Usuario / Actor</th>
              <th className="p-4">Evento / Acción</th>
              <th className="p-4">Detalle Trazable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-slate-50/50 transition">
                <td className="p-4 text-slate-400 font-mono">{ev.fecha}</td>
                <td className="p-4 font-bold text-slate-800">{ev.actor}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-md border border-slate-200">
                    {ev.accion}
                  </span>
                </td>
                <td className="p-4 text-slate-600">{ev.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};