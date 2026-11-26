// src/pages/KafkaAdmin.tsx
// Administración de la plataforma Kafka (EP5): cluster, tópicos, configuraciones y consumer groups.
// Consume ms-vidasalud-kafka-admin a través del API Gateway / BFF (rol Admin).
import React, { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  Server,
  Layers,
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  Lock,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { errorMessage } from "../services/api";
import {
  kafkaApi,
  formatRetention,
  ALLOWED_TOPIC_CONFIGS,
  PROTECTED_TOPICS,
} from "../services/kafkaApi";
import type {
  ClusterInfo,
  TopicSummary,
  TopicInfo,
  ConsumerGroupSummary,
  ConsumerGroupDetail,
} from "../services/kafkaApi";
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

type Tab = "topics" | "groups";

const RETENTION_PRESETS = [
  { label: "1 hora", value: "3600000" },
  { label: "1 día", value: "86400000" },
  { label: "7 días", value: "604800000" },
  { label: "14 días", value: "1209600000" },
  { label: "30 días", value: "2592000000" },
  { label: "Ilimitada", value: "-1" },
];

const groupStateClass = (state: string) => {
  switch (state?.toUpperCase()) {
    case "STABLE":
      return "bg-emerald-100 text-emerald-700";
    case "EMPTY":
      return "bg-slate-100 text-slate-600";
    case "PREPARINGREBALANCE":
    case "COMPLETINGREBALANCE":
      return "bg-amber-100 text-amber-700";
    case "DEAD":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
};

export const KafkaAdmin = () => {
  const [tab, setTab] = useState<Tab>("topics");
  const [cluster, setCluster] = useState<ClusterInfo | null>(null);
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [groups, setGroups] = useState<ConsumerGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterError, setClusterError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [showInternal, setShowInternal] = useState(false);

  // Detalle de tópico
  const [selectedTopic, setSelectedTopic] = useState<TopicInfo | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [configKey, setConfigKey] = useState<string>("retention.ms");
  const [configValue, setConfigValue] = useState("");
  const [newPartitions, setNewPartitions] = useState<number | "">("");

  // Detalle de consumer group
  const [selectedGroup, setSelectedGroup] = useState<ConsumerGroupDetail | null>(null);

  // Crear tópico
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    partitions: 3,
    replicationFactor: 1,
    retention: "604800000",
    cleanup: "delete",
    minIsr: "",
  });

  const notifyError = (err: unknown) => setFeedback({ kind: "error", text: errorMessage(err) });
  const notifyOk = (text: string) => setFeedback({ kind: "success", text });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [clusterRes, topicsRes, groupsRes] = await Promise.allSettled([
      kafkaApi.getCluster(),
      kafkaApi.listTopics(),
      kafkaApi.listConsumerGroups(),
    ]);

    if (clusterRes.status === "fulfilled") {
      setCluster(clusterRes.value);
      setClusterError(null);
    } else {
      setCluster(null);
      setClusterError(errorMessage(clusterRes.reason));
    }
    if (topicsRes.status === "fulfilled") {
      setTopics([...topicsRes.value].sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (groupsRes.status === "fulfilled") {
      setGroups([...groupsRes.value].sort((a, b) => a.groupId.localeCompare(b.groupId)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const brokerCount = cluster?.brokers.length ?? 0;
  const visibleTopics = topics.filter((t) => showInternal || !t.internal);
  const isDlt = (name: string) => name.endsWith(".DLT");

  // ---------- Tópicos ----------

  const openTopic = async (name: string) => {
    setTopicLoading(true);
    try {
      const info = await kafkaApi.getTopic(name);
      setSelectedTopic(info);
      setConfigKey("retention.ms");
      setConfigValue(info.configs["retention.ms"] ?? "");
      setNewPartitions(info.partitions + 1);
    } catch (err) {
      notifyError(err);
    } finally {
      setTopicLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const configs: Record<string, string> = {
      "retention.ms": form.retention,
      "cleanup.policy": form.cleanup,
    };
    if (form.minIsr.trim() !== "") configs["min.insync.replicas"] = form.minIsr.trim();

    setSaving(true);
    try {
      const created = await kafkaApi.createTopic({
        name: form.name.trim(),
        partitions: Number(form.partitions),
        replicationFactor: Number(form.replicationFactor),
        configs,
      });
      notifyOk(`Tópico "${created.name}" creado con ${created.partitions} particiones y RF ${created.replicationFactor}.`);
      setShowCreate(false);
      setForm({ ...form, name: "" });
      loadAll();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    const isProtected = PROTECTED_TOPICS.includes(name);
    const question = isProtected
      ? `"${name}" es un tópico de negocio protegido. Eliminarlo detiene el flujo de eventos.\n\n¿Confirmas la eliminación forzada (force=true)?`
      : `¿Eliminar el tópico "${name}"? Se perderán sus mensajes.`;
    if (!window.confirm(question)) return;

    try {
      await kafkaApi.deleteTopic(name, isProtected);
      notifyOk(`Tópico "${name}" eliminado.`);
      if (selectedTopic?.name === name) setSelectedTopic(null);
      loadAll();
    } catch (err) {
      notifyError(err);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;
    try {
      const updated = await kafkaApi.updateTopicConfig(selectedTopic.name, { [configKey]: configValue.trim() });
      setSelectedTopic(updated);
      notifyOk(`Configuración "${configKey}" de ${selectedTopic.name} actualizada a ${configValue.trim()}.`);
    } catch (err) {
      notifyError(err);
    }
  };

  const handleIncreasePartitions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic || newPartitions === "") return;
    if (Number(newPartitions) <= selectedTopic.partitions) {
      setFeedback({ kind: "error", text: "Kafka solo permite aumentar particiones, nunca reducirlas." });
      return;
    }
    if (
      !window.confirm(
        `Aumentar ${selectedTopic.name} a ${newPartitions} particiones cambia el reparto de keys (hash % particiones). ¿Continuar?`
      )
    )
      return;
    try {
      await kafkaApi.increasePartitions(selectedTopic.name, Number(newPartitions));
      notifyOk(`${selectedTopic.name} ahora tiene ${newPartitions} particiones.`);
      await openTopic(selectedTopic.name);
      loadAll();
    } catch (err) {
      notifyError(err);
    }
  };

  // ---------- Consumer groups ----------

  const openGroup = async (groupId: string) => {
    try {
      setSelectedGroup(await kafkaApi.getConsumerGroup(groupId));
    } catch (err) {
      notifyError(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Encabezado */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-600" /> Administración de Kafka
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tópicos, configuraciones (retención, cleanup policy, particiones, réplicas) y consumer groups — ms-vidasalud-kafka-admin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              cluster ? "bg-emerald-100 text-emerald-700" : loading ? "bg-slate-100 text-slate-500" : "bg-rose-100 text-rose-700"
            }`}
          >
            {cluster ? "Cluster conectado" : loading ? "Conectando..." : "Cluster no disponible"}
          </span>
          <button
            type="button"
            onClick={loadAll}
            title="Recargar"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <FeedbackBanner message={feedback} onClose={() => setFeedback(null)} />

      {clusterError && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">No se pudo consultar el cluster Kafka.</p>
            <p className="mt-0.5">{clusterError}</p>
            <p className="mt-1 text-amber-700">
              Verifica que el cluster (kafka/docker-compose.yml) y ms-vidasalud-kafka-admin estén levantados.
            </p>
          </div>
        </div>
      )}

      {/* Métricas del cluster */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Cluster ID"
          value={<span className="text-sm font-mono">{cluster?.clusterId ?? "—"}</span>}
          hint={cluster ? `Controller: broker ${cluster.controllerId}` : "Sin conexión"}
          icon={<Server className="w-6 h-6" />}
          tone="indigo"
        />
        <StatCard
          label="Brokers"
          value={loading ? "..." : brokerCount}
          hint={cluster?.brokers.map((b) => `${b.host}:${b.port}`).join(" · ") || "—"}
          icon={<Cpu className="w-6 h-6" />}
          tone="blue"
        />
        <StatCard
          label="Tópicos"
          value={loading ? "..." : topics.filter((t) => !t.internal).length}
          hint={`${topics.filter((t) => isDlt(t.name)).length} Dead Letter Topics`}
          icon={<Layers className="w-6 h-6" />}
          tone="emerald"
        />
        <StatCard
          label="Consumer Groups"
          value={loading ? "..." : groups.length}
          hint={`${groups.filter((g) => g.state?.toUpperCase() === "STABLE").length} estables`}
          icon={<Users className="w-6 h-6" />}
          tone="purple"
        />
      </div>

      {/* Pestañas */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {(
            [
              { id: "topics", label: "Tópicos" },
              { id: "groups", label: "Consumer Groups" },
            ] as const
          ).map((t) => (
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

        {tab === "topics" && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold cursor-pointer">
              <input type="checkbox" checked={showInternal} onChange={(e) => setShowInternal(e.target.checked)} />
              Mostrar internos
            </label>
            <button
              type="button"
              onClick={() => {
                setForm((f) => ({ ...f, replicationFactor: Math.max(1, Math.min(3, brokerCount || 1)) }));
                setShowCreate(true);
              }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-md"
            >
              <Plus className="w-4 h-4" /> Nuevo Tópico
            </button>
          </div>
        )}
      </div>

      {/* Tabla de tópicos */}
      {tab === "topics" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Consultando tópicos...</div>
          ) : visibleTopics.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No hay tópicos para mostrar.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Tópico</th>
                  <th className="p-4">Particiones</th>
                  <th className="p-4">Factor Replicación</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleTopics.map((t) => (
                  <tr key={t.name} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-800">{t.name}</td>
                    <td className="p-4 text-slate-600">{t.partitions}</td>
                    <td className="p-4 text-slate-600">{t.replicationFactor}</td>
                    <td className="p-4 space-x-1">
                      {t.internal ? (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">INTERNO</span>
                      ) : isDlt(t.name) ? (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">DLT</span>
                      ) : PROTECTED_TOPICS.includes(t.name) ? (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> NEGOCIO
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">USUARIO</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openTopic(t.name)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Detalle
                      </button>
                      {!t.internal && (
                        <button
                          type="button"
                          onClick={() => handleDelete(t.name)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Consumer groups */}
      {tab === "groups" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Consultando consumer groups...</div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No hay consumer groups registrados. Se crean cuando ms-vidasalud-notify arranca con KAFKA_ENABLED=true.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Group ID</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {groups.map((g) => (
                  <tr key={g.groupId} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-800">{g.groupId}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${groupStateClass(g.state)}`}>{g.state}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => openGroup(g.groupId)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Offsets y Lag
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {topicLoading && <p className="text-xs text-slate-400 text-center">Cargando detalle del tópico...</p>}

      {/* Modal: crear tópico */}
      {showCreate && (
        <Modal title="Nuevo Tópico Kafka" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: pruebas.demo"
                pattern="[A-Za-z0-9._\-]{1,249}"
                title="Solo letras, números, punto, guion y guion bajo"
                className={inputClass}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Particiones</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.partitions}
                  onChange={(e) => setForm({ ...form, partitions: Number(e.target.value) })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Factor de replicación</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, brokerCount || 10)}
                  value={form.replicationFactor}
                  onChange={(e) => setForm({ ...form, replicationFactor: Number(e.target.value) })}
                  className={inputClass}
                  required
                />
                <span className="text-[10px] text-slate-400">Máximo: {brokerCount || "?"} broker(s)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Retención (retention.ms)</label>
                <select
                  value={form.retention}
                  onChange={(e) => setForm({ ...form, retention: e.target.value })}
                  className={inputClass}
                >
                  {RETENTION_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Cleanup policy</label>
                <select
                  value={form.cleanup}
                  onChange={(e) => setForm({ ...form, cleanup: e.target.value })}
                  className={inputClass}
                >
                  <option value="delete">delete (eventos)</option>
                  <option value="compact">compact (último valor por key)</option>
                  <option value="compact,delete">compact,delete</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>min.insync.replicas (opcional)</label>
              <input
                type="number"
                min={1}
                max={form.replicationFactor}
                value={form.minIsr}
                onChange={(e) => setForm({ ...form, minIsr: e.target.value })}
                placeholder={`Ej: ${Math.max(1, form.replicationFactor - 1)}`}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className={secondaryButton}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} className={primaryButton}>
                {saving ? "Creando..." : "Crear Tópico"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: detalle de tópico */}
      {selectedTopic && (
        <Modal title={`Tópico ${selectedTopic.name}`} onClose={() => setSelectedTopic(null)} wide>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ["Particiones", selectedTopic.partitions],
              ["Factor replicación", selectedTopic.replicationFactor],
              ["Retención", formatRetention(selectedTopic.configs["retention.ms"])],
              ["Cleanup policy", selectedTopic.configs["cleanup.policy"] ?? "—"],
            ].map(([label, value]) => (
              <div key={label as string} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                <p className="text-sm font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wide">Particiones (líder, réplicas, ISR)</h4>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="p-2.5">Partición</th>
                    <th className="p-2.5">Líder</th>
                    <th className="p-2.5">Réplicas</th>
                    <th className="p-2.5">ISR</th>
                    <th className="p-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTopic.partitionDetails.map((p) => {
                    const underReplicated = p.isr.length < p.replicas.length;
                    return (
                      <tr key={p.partition}>
                        <td className="p-2.5 font-mono font-bold">{p.partition}</td>
                        <td className="p-2.5">{p.leader >= 0 ? `broker ${p.leader}` : "sin líder"}</td>
                        <td className="p-2.5 font-mono">[{p.replicas.join(", ")}]</td>
                        <td className="p-2.5 font-mono">[{p.isr.join(", ")}]</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              underReplicated ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {underReplicated ? "SUB-REPLICADA" : "SINCRONIZADA"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form onSubmit={handleUpdateConfig} className="p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-indigo-600" /> Modificar configuración
              </h4>
              <select
                value={configKey}
                onChange={(e) => {
                  setConfigKey(e.target.value);
                  setConfigValue(selectedTopic.configs[e.target.value] ?? "");
                }}
                className={inputClass}
              >
                {ALLOWED_TOPIC_CONFIGS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                placeholder="Nuevo valor"
                className={inputClass}
                required
              />
              {configKey === "retention.ms" && (
                <p className="text-[10px] text-slate-400">Equivale a: {formatRetention(configValue)}</p>
              )}
              <button type="submit" className={primaryButton + " w-full"}>
                Aplicar configuración
              </button>
            </form>

            <form onSubmit={handleIncreasePartitions} className="p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> Aumentar particiones
              </h4>
              <input
                type="number"
                min={selectedTopic.partitions + 1}
                max={100}
                value={newPartitions}
                onChange={(e) => setNewPartitions(e.target.value ? Number(e.target.value) : "")}
                className={inputClass}
                required
              />
              <p className="text-[10px] text-slate-400">
                Actual: {selectedTopic.partitions}. Kafka no permite reducir particiones; más particiones = más consumidores en
                paralelo dentro del mismo grupo.
              </p>
              <button type="submit" className={primaryButton + " w-full"}>
                Aumentar
              </button>
            </form>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wide">Configuración efectiva</h4>
            <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 text-xs">
              {Object.entries(selectedTopic.configs)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => {
                  const overridden = selectedTopic.overriddenConfigs.includes(k);
                  return (
                    <div key={k} className={`flex justify-between gap-4 p-2.5 ${overridden ? "bg-indigo-50/60" : ""}`}>
                      <span className="font-mono text-slate-600">
                        {k}
                        {overridden && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">
                            PERSONALIZADA
                          </span>
                        )}
                      </span>
                      <span className="font-mono font-bold text-slate-800 break-all text-right">{v}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: detalle de consumer group */}
      {selectedGroup && (
        <Modal title={`Consumer group ${selectedGroup.groupId}`} onClose={() => setSelectedGroup(null)} wide>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ["Estado", selectedGroup.state],
              ["Assignor", selectedGroup.partitionAssignor || "—"],
              ["Miembros", selectedGroup.members.length],
              ["Lag total", selectedGroup.totalLag],
            ].map(([label, value]) => (
              <div key={label as string} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                <p
                  className={`text-sm font-black ${
                    label === "Lag total" && Number(value) > 0 ? "text-amber-600" : "text-slate-900"
                  }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wide">
              Miembros y particiones asignadas
            </h4>
            {selectedGroup.members.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">
                Sin consumidores activos (grupo EMPTY): los offsets confirmados se conservan y el grupo retoma desde ahí al volver.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedGroup.members.map((m) => (
                  <div key={m.consumerId} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <p className="font-mono font-bold text-slate-800 break-all">{m.consumerId}</p>
                    <p className="text-slate-500 mt-0.5">
                      client: {m.clientId} · host: {m.host}
                    </p>
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {m.partitions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wide">Offsets por partición</h4>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="p-2.5">Tópico</th>
                    <th className="p-2.5">Partición</th>
                    <th className="p-2.5">Offset confirmado</th>
                    <th className="p-2.5">Log end offset</th>
                    <th className="p-2.5">Lag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedGroup.offsets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-slate-400">
                        El grupo aún no confirma offsets.
                      </td>
                    </tr>
                  ) : (
                    [...selectedGroup.offsets]
                      .sort((a, b) => a.topic.localeCompare(b.topic) || a.partition - b.partition)
                      .map((o) => (
                        <tr key={`${o.topic}-${o.partition}`}>
                          <td className="p-2.5 font-mono">{o.topic}</td>
                          <td className="p-2.5 font-mono font-bold">{o.partition}</td>
                          <td className="p-2.5 font-mono">{o.committedOffset}</td>
                          <td className="p-2.5 font-mono">{o.logEndOffset}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                o.lag > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {o.lag}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => openGroup(selectedGroup.groupId)} className={secondaryButton + " text-xs flex items-center gap-1.5"}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar offsets
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
