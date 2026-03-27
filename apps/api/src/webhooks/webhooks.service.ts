import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import {
  PaymentProvider,
  WebhookEvent,
} from '@pay-gate-simulator/shared';
import { WebhookEventEntity } from '../payment/entities/webhook-event.entity';
import { GatewayRegistryService } from '../gateways/gateway-registry.service';

interface SseClient {
  id: string;
  response: Response;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private sseClients: SseClient[] = [];

  constructor(
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepo: Repository<WebhookEventEntity>,
    private readonly gatewayRegistry: GatewayRegistryService,
  ) {}

  async handleWebhook(
    provider: PaymentProvider,
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<WebhookEvent> {
    const adapter = this.gatewayRegistry.getAdapter(provider);
    const event = await adapter.verifyWebhook(headers, rawBody);

    const entity = this.webhookEventRepo.create({
      provider,
      eventId: event.eventId,
      eventType: event.eventType,
      chargeId: event.chargeId,
      refundId: event.refundId,
      payload: event.payload,
      verified: event.verified,
      receivedAt: new Date(),
    });

    await this.webhookEventRepo.save(entity);
    this.logger.log(`Webhook received: ${event.eventType} from ${provider} (verified=${event.verified})`);

    this.broadcastSse(event);

    return event;
  }

  addSseClient(id: string, response: Response): void {
    this.sseClients.push({ id, response });
    this.logger.log(`SSE client connected: ${id} (total: ${this.sseClients.length})`);

    response.on('close', () => {
      this.sseClients = this.sseClients.filter((c) => c.id !== id);
      this.logger.log(`SSE client disconnected: ${id} (total: ${this.sseClients.length})`);
    });
  }

  private broadcastSse(event: WebhookEvent): void {
    const data = JSON.stringify(event);
    for (const client of this.sseClients) {
      client.response.write(`data: ${data}\n\n`);
    }
  }
}
