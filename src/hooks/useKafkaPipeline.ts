// src/hooks/useKafkaPipeline.ts
// Estado del pipeline Kafka de VidaSalud leído desde ms-vidasalud-kafka-admin:
//   appointments --(productor)--> vidasalud.citas --(grupo vidasalud-notify)--> notify (auditoría)
//   streams ----------------->  vidasalud.alertas --(grupo vidasalud-notify-alertas)--> notify (alertas)
// Los endpoints /api/kafka/** son solo para Admin: para otros roles el hook queda en "forbidden".
import { useCallback, useEffect, useState } from "react";
import { ApiError, errorMessage } from "../services/api";
import { kafkaApi, VIDASALUD_GROUPS, VIDASALUD_TOPICS } from "../services/kafkaApi";
import type { ConsumerGroupDetail, ConsumerGroupOffset, TopicInfo } from "../services/kafkaApi";

export interface PartitionStat {
  partition: number;
  published: number; // log end offset = mensajes escritos en la partición
  consumed: number; // offset confirmado por el grupo
  lag: number;
}

export interface TopicFlowStats {
  topic: string;
  group: string;
  groupState: string;
  members: number;
  published: number;
  consumed: number;
  lag: number;
  partitions: PartitionStat[];
}

export interface KafkaPipelineState {
  status: "loading" | "ok" | "forbidden" | "error";
  error: string | null;
  citasTopic: TopicInfo | null;
  citas: TopicFlowStats | null;
  alertas: TopicFlowStats | null;
  refresh: () => void;
}

function flowStats(topic: string, group: ConsumerGroupDetail | null, partitionCount: number): TopicFlowStats {
  const offsets: ConsumerGroupOffset[] = (group?.offsets ?? []).filter((o) => o.topic === topic);
  const partitions: PartitionStat[] = Array.from({ length: Math.max(partitionCount, offsets.length) }, (_, p) => {
    const o = offsets.find((x) => x.partition === p);
    return {
      partition: p,
      published: Math.max(0, o?.logEndOffset ?? 0),
      consumed: Math.max(0, o?.committedOffset ?? 0),
      lag: Math.max(0, o?.lag ?? 0),
    };
  });
  return {
    topic,
    group: group?.groupId ?? "—",
    groupState: group?.state ?? "SIN GRUPO",
    members: group?.members.length ?? 0,
    published: partitions.reduce((s, p) => s + p.published, 0),
    consumed: partitions.reduce((s, p) => s + p.consumed, 0),
    lag: partitions.reduce((s, p) => s + p.lag, 0),
    partitions,
  };
}

export function useKafkaPipeline(enabled: boolean, refreshMs = 10000): KafkaPipelineState {
  const [status, setStatus] = useState<KafkaPipelineState["status"]>(enabled ? "loading" : "forbidden");
  const [error, setError] = useState<string | null>(null);
  const [citasTopic, setCitasTopic] = useState<TopicInfo | null>(null);
  const [citas, setCitas] = useState<TopicFlowStats | null>(null);
  const [alertas, setAlertas] = useState<TopicFlowStats | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setStatus("forbidden");
      return;
    }
    try {
      const [topic, alertTopic, notifyGroup, alertGroup] = await Promise.all([
        kafkaApi.getTopic(VIDASALUD_TOPICS.citas),
        kafkaApi.getTopic(VIDASALUD_TOPICS.alertas).catch(() => null),
        kafkaApi.getConsumerGroup(VIDASALUD_GROUPS.notify).catch(() => null),
        kafkaApi.getConsumerGroup(VIDASALUD_GROUPS.alertas).catch(() => null),
      ]);
      setCitasTopic(topic);
      setCitas(flowStats(VIDASALUD_TOPICS.citas, notifyGroup, topic.partitions));
      setAlertas(flowStats(VIDASALUD_TOPICS.alertas, alertGroup, alertTopic?.partitions ?? 0));
      setError(null);
      setStatus("ok");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setStatus("forbidden");
      } else {
        setStatus("error");
        setError(errorMessage(err));
      }
    }
  }, [enabled]);

  useEffect(() => {
    load();
    if (!enabled) return;
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, enabled, refreshMs]);

  return { status, error, citasTopic, citas, alertas, refresh: load };
}
