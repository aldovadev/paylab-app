"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WebhookSseEvent {
  eventId: string;
  eventType: string;
  provider: string;
  chargeId?: string;
  payload: Record<string, unknown>;
  verified: boolean;
}

export function useWebhookStream(apiBaseUrl?: string) {
  const [events, setEvents] = useState<WebhookSseEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const base = apiBaseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3100/api";
    const es = new EventSource(`${base}/webhooks/events/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === "connected") return;
      setEvents((prev) => [data, ...prev].slice(0, 200));
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    connect();
    return () => eventSourceRef.current?.close();
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
