// src/services/kafkaApi.ts
// Cliente de ms-vidasalud-kafka-admin (vía API Gateway -> BFF -> /api/kafka/**). Solo rol Admin.
// Los tipos replican los DTO (records) del backend: com.vidasalud.kafkaadmin.dto.*
import { apiFetch } from "./api";

export interface KafkaBroker {
  id: number;
  host: string;
  port: number;
}

export interface ClusterInfo {
  clusterId: string;
  controllerId: number;
  brokers: KafkaBroker[];
}

export interface TopicSummary {
  name: string;
  internal: boolean;
  partitions: number;
  replicationFactor: number;
}

export interface PartitionInfo {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
}

export interface TopicInfo {
  name: string;
  internal: boolean;
  partitions: number;
  replicationFactor: number;
  partitionDetails: PartitionInfo[];
  configs: Record<string, string>;
  overriddenConfigs: string[];
}

export interface TopicRequest {
  name: string;
  partitions: number;
  replicationFactor: number;
  configs?: Record<string, string>;
}

export interface ConsumerGroupSummary {
  groupId: string;
  state: string;
}

export interface ConsumerGroupMember {
  consumerId: string;
  clientId: string;
  host: string;
  partitions: string[];
}

export interface ConsumerGroupOffset {
  topic: string;
  partition: number;
  committedOffset: number;
  logEndOffset: number;
  lag: number;
}

export interface ConsumerGroupDetail {
  groupId: string;
  state: string;
  partitionAssignor: string;
  members: ConsumerGroupMember[];
  offsets: ConsumerGroupOffset[];
  totalLag: number;
}

/** Claves que acepta el backend (TopicConfigPolicy). Cualquier otra responde 400. */
export const ALLOWED_TOPIC_CONFIGS = [
  "retention.ms",
  "retention.bytes",
  "cleanup.policy",
  "min.insync.replicas",
  "delete.retention.ms",
  "segment.bytes",
  "segment.ms",
  "max.message.bytes",
  "compression.type",
  "min.cleanable.dirty.ratio",
] as const;

/** Tópicos de negocio: el backend exige ?force=true para eliminarlos. */
export const PROTECTED_TOPICS = ["vidasalud.citas", "vidasalud.alertas", "vidasalud.citas-por-paciente"];

/** Topología Kafka del proyecto (ver README backend, sección 11 sexies). */
export const VIDASALUD_TOPICS = {
  citas: "vidasalud.citas",
  alertas: "vidasalud.alertas",
  porPaciente: "vidasalud.citas-por-paciente",
} as const;

export const VIDASALUD_GROUPS = {
  notify: "vidasalud-notify",
  alertas: "vidasalud-notify-alertas",
} as const;

const enc = encodeURIComponent;

export const kafkaApi = {
  getCluster: () => apiFetch<ClusterInfo>("/api/kafka/cluster"),

  // Tópicos
  listTopics: () => apiFetch<TopicSummary[]>("/api/kafka/topics"),

  getTopic: (name: string) => apiFetch<TopicInfo>(`/api/kafka/topics/${enc(name)}`),

  createTopic: (data: TopicRequest) =>
    apiFetch<TopicSummary>("/api/kafka/topics", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTopicConfig: (name: string, configs: Record<string, string>) =>
    apiFetch<TopicInfo>(`/api/kafka/topics/${enc(name)}/config`, {
      method: "PUT",
      body: JSON.stringify({ configs }),
    }),

  increasePartitions: (name: string, totalPartitions: number) =>
    apiFetch<TopicSummary>(`/api/kafka/topics/${enc(name)}/partitions`, {
      method: "PUT",
      body: JSON.stringify({ totalPartitions }),
    }),

  deleteTopic: (name: string, force = false) =>
    apiFetch<void>(`/api/kafka/topics/${enc(name)}${force ? "?force=true" : ""}`, {
      method: "DELETE",
    }),

  // Consumer groups
  listConsumerGroups: () => apiFetch<ConsumerGroupSummary[]>("/api/kafka/consumer-groups"),

  getConsumerGroup: (groupId: string) =>
    apiFetch<ConsumerGroupDetail>(`/api/kafka/consumer-groups/${enc(groupId)}`),
};

// --- Utilidades de presentación ---

/** Convierte retention.ms a texto legible (7 días, 12 h, ilimitado...). */
export function formatRetention(ms?: string): string {
  if (ms === undefined || ms === null || ms === "") return "—";
  const n = Number(ms);
  if (Number.isNaN(n)) return ms;
  if (n < 0) return "Ilimitada";
  const day = 86_400_000;
  const hour = 3_600_000;
  if (n % day === 0) return `${n / day} día${n / day === 1 ? "" : "s"}`;
  if (n % hour === 0) return `${n / hour} h`;
  if (n >= 60_000) return `${Math.round(n / 60_000)} min`;
  return `${n} ms`;
}

/**
 * Réplica del particionador por defecto de Kafka para mensajes con key:
 *   partition = toPositive(murmur2(keyBytes)) % numPartitions
 * (org.apache.kafka.common.utils.Utils#murmur2). El productor de appointments usa
 * StringSerializer y key "cita-{id}", así que esto indica en qué partición caen
 * todos los eventos de una cita (orden garantizado por cita).
 */
export function murmur2(data: Uint8Array): number {
  const length = data.length;
  const seed = 0x9747b28c;
  const m = 0x5bd1e995;
  const r = 24;
  let h = seed ^ length;
  const length4 = Math.floor(length / 4);

  for (let i = 0; i < length4; i++) {
    const i4 = i * 4;
    let k =
      (data[i4] & 0xff) |
      ((data[i4 + 1] & 0xff) << 8) |
      ((data[i4 + 2] & 0xff) << 16) |
      ((data[i4 + 3] & 0xff) << 24);
    k = Math.imul(k, m);
    k ^= k >>> r;
    k = Math.imul(k, m);
    h = Math.imul(h, m);
    h ^= k;
  }

  const tail = length & ~3;
  const rest = length % 4;
  if (rest === 3) h ^= (data[tail + 2] & 0xff) << 16;
  if (rest >= 2) h ^= (data[tail + 1] & 0xff) << 8;
  if (rest >= 1) {
    h ^= data[tail] & 0xff;
    h = Math.imul(h, m);
  }

  h ^= h >>> 13;
  h = Math.imul(h, m);
  h ^= h >>> 15;
  return h | 0;
}

export function partitionForKey(key: string, numPartitions: number): number {
  if (numPartitions <= 0) return 0;
  const bytes = new TextEncoder().encode(key);
  return (murmur2(bytes) & 0x7fffffff) % numPartitions;
}

export const appointmentKey = (id: number) => `cita-${id}`;
