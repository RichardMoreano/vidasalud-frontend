import { BarChart3, TrendingUp, Clock, Users, Activity } from "lucide-react";

export const Reports = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" /> Panel de Análitica & Reportería Kafka
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Métricas procesadas vía Streaming Asíncrono sin impacto en la BD transaccional core
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold animate-pulse">
          Kafka Pipeline Activo
        </span>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Atenciones / Hora</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">42 citas/h</p>
          <span className="text-[11px] text-emerald-600 font-semibold">↑ 18% pico máximo 11:00 AM</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Tiempo Medio de Espera</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900">14.2 min</p>
          <span className="text-[11px] text-emerald-600 font-semibold">↓ 3.5 min en comparación a ayer</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase">Prestación Más Demandada</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">Medicina General</p>
          <span className="text-[11px] text-slate-400">340 atenciones procesadas</span>
        </div>
      </div>

      {/* Gráfico Simulado de Atenciones */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Distribución Operativa de Atenciones por Hora</h3>
        <div className="h-48 flex items-end gap-3 pt-6 border-b border-slate-100">
          {[15, 28, 45, 60, 80, 95, 70, 50, 40, 30].map((val, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
              <div 
                style={{ height: `${val}%` }} 
                className="w-full bg-indigo-500 rounded-t-lg group-hover:bg-indigo-600 transition-all relative"
              >
                <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-bold">
                  {val}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{8 + idx}:00</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};