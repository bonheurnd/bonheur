import express from 'express';

export const eventStreamClients = new Set<express.Response>();

export function broadcastRealtimeEvent(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify({
    type: eventType,
    data: payload,
    timestamp: new Date().toISOString()
  })}\n\n`;

  for (const client of eventStreamClients) {
    try {
      client.write(message);
    } catch {
      eventStreamClients.delete(client);
    }
  }
}
