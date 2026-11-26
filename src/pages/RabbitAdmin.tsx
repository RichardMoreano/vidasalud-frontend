// src/pages/RabbitAdmin.tsx
// Administración de RabbitMQ (EP3): colas (incl. DLQ), exchanges y bindings.
// Consume ms-vidasalud-rabbit-admin a través del API Gateway / BFF (rol Admin).
import React, { useCallback, useEffect, useState } from "react";
import { Inbox, Plus, RefreshCw, Trash2, Eraser, Share2, Link2, AlertTriangle } from "lucide-react";
import { errorMessage } from "../services/api";
import { rabbitApi } from "../services/rabbitApi";
import type { RabbitQueue, RabbitExchange, RabbitBinding, ExchangeType } from "../services/rabbitApi";
import {
  FeedbackBanner,
  Modal,
  StatCard,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "../components/ui";
import type { FeedbackMessage } from "../components/ui";

type Tab = "queues" | "exchanges" | "bindings";
type CreateKind = "queue" | "exchange" | "binding" | null;

const isSystemExchange = (name: string) => name === "" || name.startsWith("amq.");

export const RabbitAdmin = () => {
  const [tab, setTab] = useState<Tab>("queues");
  const [queues, setQueues] = useState<RabbitQueue[]>([]);
  const [exchanges, setExchanges] = useState<RabbitExchange[]>([]);
  const [bindings, setBindings] = useState<RabbitBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [creating, setCreating] = useState<CreateKind>(null);

  const [queueForm, setQueueForm] = useState({ name: "", dlx: "", dlrk: "", ttl: "", maxLength: "" });
  const [exchangeForm, setExchangeForm] = useState<{ name: string; type: ExchangeType }>({ name: "", type: "direct" });
  const [bindingForm, setBindingForm] = useState({
    exchange: "",
    destination: "",
    destinationType: "QUEUE" as "QUEUE" | "EXCHANGE",
    routingKey: "",
  });

  const notifyError = (err: unknown) => setFeedback({ kind: "error", text: errorMessage(err) });
  const notifyOk = (text: string) => setFeedback({ kind: "success", text });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [q, e, b] = await Promise.allSettled([
      rabbitApi.listQueues(),
      rabbitApi.listExchanges(),
      rabbitApi.listBindings(),
    ]);
    if (q.status === "fulfilled") setQueues([...q.value].sort((a, b2) => a.name.localeCompare(b2.name)));
    if (e.status === "fulfilled") setExchanges([...e.value].sort((a, b2) => a.name.localeCompare(b2.name)));
    if (b.status === "fulfilled") setBindings(b.value.filter((x) => x.source !== ""));
    const firstError = [q, e, b].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    setLoadError(firstError ? errorMessage(firstError.reason) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const dlqs = queues.filter((q) => q.name.endsWith(".dlq"));
  const dlqMessages = dlqs.reduce((sum, q) => sum + (q.messages ?? 0), 0);
  const userExchanges = exchanges.filter((x) => !isSystemExchange(x.name));

  const run = async (action: () => Promise<unknown>, ok: string) => {
    try {
      await action();
      notifyOk(ok);
      setCreating(null);
      loadAll();
    } catch (err) {
      notifyError(err);
    }
  };

  const optionalNumber = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const optionalText = (v: string) => (v.trim() === "" ? undefined : v.trim());

  const submitQueue = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () =>
        rabbitApi.createQueue({
          name: queueForm.name.trim(),
          durable: true,
          deadLetterExchange: optionalText(queueForm.dlx),
          deadLetterRoutingKey: optionalText(queueForm.dlrk),
          messageTtlMs: optionalNumber(queueForm.ttl),
          maxLength: optionalNumber(queueForm.maxLength),
        }),
      `Cola "${queueForm.name}" creada.`
    );
  };

  const submitExchange = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => rabbitApi.createExchange({ name: exchangeForm.name.trim(), type: exchangeForm.type, durable: true }),
      `Exchange "${exchangeForm.name}" (${exchangeForm.type}) creado.`
    );
  };

  const submitBinding = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => rabbitApi.createBinding({ ...bindingForm, routingKey: bindingForm.routingKey.trim() }),
      `Binding ${bindingForm.exchange} → ${bindingForm.destination} creado.`
    );
  };

  const tabs = [
    { id: "queues", label: `Colas (${queues.length})` },
    { id: "exchanges", label: `Exchanges (${userExchanges.length})` },
    { id: "bindings", label: `Bindings (${bindings.length})` },
  ] as const;

  const createLabel = { queues: "Nueva Cola", exchanges: "Nuevo Exchange", bindings: "Nuevo Binding" }[tab];
  const createKind: CreateKind = { queues: "queue", exchanges: "exchange", bindings: "binding" }[tab] as CreateKind;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-orange-500" /> Administración de RabbitMQ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Colas de comandos, Dead Letter Queues, exchanges y bindings — ms-vidasalud-rabbit-admin
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          title="Recargar"
          className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl border border-slate-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <FeedbackBanner message={feedback} onClose={() => setFeedback(null)} />

      {loadError && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>No se pudo consultar RabbitMQ: {loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Colas" value={loading ? "..." : queues.length} hint={`${dlqs.length} DLQ`} icon={<Inbox className="w-6 h-6" />} tone="amber" />
        <StatCard
          label="Mensajes en DLQ"
          value={loading ? "..." : dlqMessages}
          hint={dlqMessages > 0 ? "Requieren revisión" : "Sin mensajes fallidos"}
          icon={<AlertTriangle className="w-6 h-6" />}
          tone={dlqMessages > 0 ? "rose" : "emerald"}
        />
        <StatCard label="Exchanges" value={loading ? "..." : userExchanges.length} hint="Sin contar amq.*" icon={<Share2 className="w-6 h-6" />} tone="blue" />
        <StatCard label="Bindings" value={loading ? "..." : bindings.length} icon={<Link2 className="w-6 h-6" />} tone="purple" />
      </div>

      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreating(createKind)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-md"
        >
          <Plus className="w-4 h-4" /> {createLabel}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Consultando RabbitMQ...</div>
        ) : tab === "queues" ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Cola</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Mensajes</th>
                <th className="p-4">Consumidores</th>
                <th className="p-4">Dead Letter</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {queues.map((q) => {
                const isDlq = q.name.endsWith(".dlq");
                const dlx = q.arguments?.["x-dead-letter-exchange"] as string | undefined;
                return (
                  <tr key={q.name} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-800">
                      {q.name}
                      {isDlq && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">DLQ</span>}
                    </td>
                    <td className="p-4 text-slate-500">{q.state ?? "—"}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          (q.messages ?? 0) > 0 && isDlq ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {q.messages ?? 0}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{q.consumers ?? 0}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-500">{dlx ?? "—"}</td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() =>
                          window.confirm(`¿Vaciar la cola "${q.name}"?`) &&
                          run(() => rabbitApi.purgeQueue(q.name), `Cola "${q.name}" vaciada.`)
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Eraser className="w-3 h-3" /> Purgar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.confirm(`¿Eliminar la cola "${q.name}"?`) &&
                          run(() => rabbitApi.deleteQueue(q.name), `Cola "${q.name}" eliminada.`)
                        }
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : tab === "exchanges" ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Exchange</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Durable</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {userExchanges.map((x) => (
                <tr key={x.name} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-mono font-bold text-slate-800">{x.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">{x.type}</span>
                  </td>
                  <td className="p-4 text-slate-600">{x.durable ? "Sí" : "No"}</td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        window.confirm(`¿Eliminar el exchange "${x.name}"?`) &&
                        run(() => rabbitApi.deleteExchange(x.name), `Exchange "${x.name}" eliminado.`)
                      }
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Exchange origen</th>
                <th className="p-4">Routing key</th>
                <th className="p-4">Destino</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {bindings.map((b) => (
                <tr key={`${b.source}|${b.routing_key}|${b.destination}`} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-mono font-bold text-slate-800">{b.source}</td>
                  <td className="p-4 font-mono text-purple-700">{b.routing_key || "(vacía)"}</td>
                  <td className="p-4 font-mono text-slate-600">
                    {b.destination} <span className="text-[10px] text-slate-400">({b.destination_type})</span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        window.confirm(`¿Eliminar binding ${b.source} → ${b.destination}?`) &&
                        run(
                          () =>
                            rabbitApi.deleteBinding({
                              exchange: b.source,
                              destination: b.destination,
                              destinationType: b.destination_type === "exchange" ? "EXCHANGE" : "QUEUE",
                              routingKey: b.routing_key,
                            }),
                          "Binding eliminado."
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating === "queue" && (
        <Modal title="Nueva Cola" onClose={() => setCreating(null)}>
          <form onSubmit={submitQueue} className="space-y-4 text-xs">
            <div>
              <label className={labelClass}>Nombre</label>
              <input className={inputClass} value={queueForm.name} onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })} placeholder="q.demo" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Dead letter exchange</label>
                <input className={inputClass} value={queueForm.dlx} onChange={(e) => setQueueForm({ ...queueForm, dlx: e.target.value })} placeholder="cmd.dead.dlx" />
              </div>
              <div>
                <label className={labelClass}>Dead letter routing key</label>
                <input className={inputClass} value={queueForm.dlrk} onChange={(e) => setQueueForm({ ...queueForm, dlrk: e.target.value })} placeholder="demo.dead" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>TTL mensajes (ms)</label>
                <input type="number" min={1} className={inputClass} value={queueForm.ttl} onChange={(e) => setQueueForm({ ...queueForm, ttl: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Largo máximo</label>
                <input type="number" min={1} className={inputClass} value={queueForm.maxLength} onChange={(e) => setQueueForm({ ...queueForm, maxLength: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setCreating(null)} className={secondaryButton}>Cancelar</button>
              <button type="submit" className={primaryButton}>Crear Cola</button>
            </div>
          </form>
        </Modal>
      )}

      {creating === "exchange" && (
        <Modal title="Nuevo Exchange" onClose={() => setCreating(null)}>
          <form onSubmit={submitExchange} className="space-y-4 text-xs">
            <div>
              <label className={labelClass}>Nombre</label>
              <input className={inputClass} value={exchangeForm.name} onChange={(e) => setExchangeForm({ ...exchangeForm, name: e.target.value })} placeholder="demo.direct" required />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <select className={inputClass} value={exchangeForm.type} onChange={(e) => setExchangeForm({ ...exchangeForm, type: e.target.value as ExchangeType })}>
                {(["direct", "topic", "fanout", "headers"] as const).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setCreating(null)} className={secondaryButton}>Cancelar</button>
              <button type="submit" className={primaryButton}>Crear Exchange</button>
            </div>
          </form>
        </Modal>
      )}

      {creating === "binding" && (
        <Modal title="Nuevo Binding" onClose={() => setCreating(null)}>
          <form onSubmit={submitBinding} className="space-y-4 text-xs">
            <div>
              <label className={labelClass}>Exchange origen</label>
              <select className={inputClass} value={bindingForm.exchange} onChange={(e) => setBindingForm({ ...bindingForm, exchange: e.target.value })} required>
                <option value="">Seleccione...</option>
                {userExchanges.map((x) => (
                  <option key={x.name} value={x.name}>{x.name} ({x.type})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Tipo destino</label>
                <select
                  className={inputClass}
                  value={bindingForm.destinationType}
                  onChange={(e) => setBindingForm({ ...bindingForm, destinationType: e.target.value as "QUEUE" | "EXCHANGE", destination: "" })}
                >
                  <option value="QUEUE">Cola</option>
                  <option value="EXCHANGE">Exchange</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Destino</label>
                <select className={inputClass} value={bindingForm.destination} onChange={(e) => setBindingForm({ ...bindingForm, destination: e.target.value })} required>
                  <option value="">Seleccione...</option>
                  {(bindingForm.destinationType === "QUEUE" ? queues.map((q) => q.name) : userExchanges.map((x) => x.name)).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Routing key</label>
              <input className={inputClass} value={bindingForm.routingKey} onChange={(e) => setBindingForm({ ...bindingForm, routingKey: e.target.value })} placeholder="email.* / admission.#" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setCreating(null)} className={secondaryButton}>Cancelar</button>
              <button type="submit" className={primaryButton}>Crear Binding</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
