// src/components/ui.tsx
// Piezas de interfaz reutilizadas por las vistas de administración (mismo estilo que Catalog/Appointments).
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export interface FeedbackMessage {
  kind: "success" | "error";
  text: string;
}

export const FeedbackBanner = ({ message, onClose }: { message: FeedbackMessage | null; onClose: () => void }) => {
  if (!message) return null;
  const isError = message.kind === "error";
  return (
    <div
      className={`p-4 rounded-xl flex items-center gap-3 text-xs border ${
        isError ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
      }`}
    >
      {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
      <span className="flex-1">{message.text}</span>
      <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100" title="Cerrar">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const Modal = ({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div
      className={`bg-white w-full ${wide ? "max-w-4xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4`}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const StatCard = ({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "purple" | "indigo";
}) => {
  const tones: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
    purple: "bg-purple-100 text-purple-600",
    indigo: "bg-indigo-100 text-indigo-600",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase">{label}</p>
        <p className="text-2xl font-black text-slate-900 truncate">{value}</p>
        {hint && <span className="text-[10px] text-slate-500 font-semibold">{hint}</span>}
      </div>
    </div>
  );
};

export const inputClass =
  "w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900";
export const labelClass = "font-semibold text-slate-700 block mb-1";
export const primaryButton =
  "px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-md transition disabled:opacity-50";
export const secondaryButton = "px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50";
