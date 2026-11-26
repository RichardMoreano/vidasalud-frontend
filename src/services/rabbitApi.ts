// src/services/rabbitApi.ts
// Cliente de ms-vidasalud-rabbit-admin (vía API Gateway -> BFF -> /api/mq/**). Solo rol Admin.
import { apiFetch } from "./api";

/** Fila de GET /api/mq/queues (proyección de la Management API de RabbitMQ). */
export interface RabbitQueue {
  name: string;
  vhost?: string;
  durable?: boolean;
  auto_delete?: boolean;
  state?: string;
  messages?: number;
  consumers?: number;
  arguments?: Record<string, unknown>;
}

export interface RabbitExchange {
  name: string;
  vhost?: string;
  type: string;
  durable?: boolean;
  auto_delete?: boolean;
}

export interface RabbitBinding {
  source: string;
  vhost?: string;
  destination: string;
  destination_type: "queue" | "exchange";
  routing_key: string;
}

export interface QueueInfo {
  name: string;
  messageCount: number;
  consumerCount: number;
}

export interface QueueRequest {
  name: string;
  durable?: boolean;
  autoDelete?: boolean;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  messageTtlMs?: number;
  maxLength?: number;
}

export type ExchangeType = "direct" | "topic" | "fanout" | "headers";

export interface ExchangeRequest {
  name: string;
  type: ExchangeType;
  durable?: boolean;
  autoDelete?: boolean;
}

export interface BindingRequest {
  exchange: string;
  destination: string;
  destinationType: "QUEUE" | "EXCHANGE";
  routingKey?: string;
}

const enc = encodeURIComponent;

export const rabbitApi = {
  // Colas
  listQueues: () => apiFetch<RabbitQueue[]>("/api/mq/queues"),
  getQueue: (name: string) => apiFetch<QueueInfo>(`/api/mq/queues/${enc(name)}`),
  createQueue: (data: QueueRequest) =>
    apiFetch<QueueInfo>("/api/mq/queues", { method: "POST", body: JSON.stringify(data) }),
  deleteQueue: (name: string, ifUnused = false, ifEmpty = false) =>
    apiFetch<void>(`/api/mq/queues/${enc(name)}?ifUnused=${ifUnused}&ifEmpty=${ifEmpty}`, {
      method: "DELETE",
    }),
  purgeQueue: (name: string) =>
    apiFetch<{ queue: string; purged: number }>(`/api/mq/queues/${enc(name)}/purge`, { method: "POST" }),

  // Exchanges
  listExchanges: () => apiFetch<RabbitExchange[]>("/api/mq/exchanges"),
  createExchange: (data: ExchangeRequest) =>
    apiFetch<{ name: string; type: string }>("/api/mq/exchanges", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteExchange: (name: string) => apiFetch<void>(`/api/mq/exchanges/${enc(name)}`, { method: "DELETE" }),

  // Bindings (el DELETE lleva el mismo cuerpo que el POST)
  listBindings: () => apiFetch<RabbitBinding[]>("/api/mq/bindings"),
  createBinding: (data: BindingRequest) =>
    apiFetch<BindingRequest>("/api/mq/bindings", { method: "POST", body: JSON.stringify(data) }),
  deleteBinding: (data: BindingRequest) =>
    apiFetch<void>("/api/mq/bindings", { method: "DELETE", body: JSON.stringify(data) }),
};
