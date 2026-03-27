"use client";

import { useState } from "react";
import { useWebhookStream } from "@/hooks/use-webhook-stream";

export default function WebhooksPage() {
  const { events, connected, clearEvents } = useWebhookStream();
  const [selectedEvent, setSelectedEvent] = useState<(typeof events)[0] | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhook Events</h1>
          <p className="text-sm text-muted-foreground">
            Real-time webhook events from Stripe and PayPal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs ${
              connected ? "text-green-500" : "text-red-500"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
            {connected ? "Connected" : "Disconnected"}
          </span>
          <button
            onClick={clearEvents}
            className="rounded-md border border-input px-3 py-1 text-xs hover:bg-accent"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Events list + detail */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Live feed */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Live Feed ({events.length})</h2>
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {events.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No webhook events yet. Run a test scenario to trigger real webhooks.
              </p>
            )}
            {events.map((evt, i) => (
              <button
                key={`${evt.eventId}-${i}`}
                onClick={() => setSelectedEvent(evt)}
                className={`w-full border-b border-border px-4 py-3 text-left hover:bg-muted/30 transition-colors ${
                  selectedEvent?.eventId === evt.eventId ? "bg-muted/40" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{evt.eventType}</span>
                  <span className="text-xs text-blue-500">LIVE</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {evt.provider} | {evt.chargeId || "N/A"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Event Detail</h2>
          </div>
          {!selectedEvent ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Select an event to view details
            </p>
          ) : (
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Event ID:</span>
                  <p className="font-mono text-xs">{selectedEvent.eventId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider:</span>
                  <p className="capitalize">{selectedEvent.provider}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p>{selectedEvent.eventType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Verified:</span>
                  <p>{selectedEvent.verified ? "Yes" : "No"}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Payload</p>
                <pre className="max-h-60 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
