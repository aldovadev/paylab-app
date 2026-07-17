import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Response } from 'express';
import {
  PaymentProvider,
  PaymentStatus,
  TransactionType,
  CallDirection,
  WebhookEvent,
  WebhookEventType,
} from '@paylab/shared';
import { WebhookEventEntity } from '../payment/entities/webhook-event.entity';
import { TransactionEntity } from '../payment/entities/transaction.entity';
import { GatewayRegistryService } from '../gateways/gateway-registry.service';
import { ApiCallLogService } from '../payment/api-call-log.service';

interface SseClient {
  id: string;
  response: Response;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';

// How far along a charge is. A webhook may only move a transaction forward.
// Terminal states share rank 2 so a late 'processing' cannot un-succeed a paid charge,
// and refund states outrank them so a replayed charge event cannot revive a refunded one.
const STATUS_RANK: Record<PaymentStatus, number> = {
  [PaymentStatus.PENDING]: 0,
  [PaymentStatus.PROCESSING]: 1,
  [PaymentStatus.SUCCEEDED]: 2,
  [PaymentStatus.FAILED]: 2,
  [PaymentStatus.CANCELLED]: 2,
  [PaymentStatus.PARTIALLY_REFUNDED]: 3,
  [PaymentStatus.REFUNDED]: 3,
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private sseClients: SseClient[] = [];

  constructor(
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepo: Repository<WebhookEventEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    private readonly gatewayRegistry: GatewayRegistryService,
    private readonly apiCallLogService: ApiCallLogService,
  ) { }

  async handleWebhook(
    provider: PaymentProvider,
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<WebhookEvent> {
    const startTime = Date.now();
    const adapter = this.gatewayRegistry.getAdapter(provider);

    // Signature check runs first. Nothing unverified is stored, settled, or broadcast.
    const event = await adapter.verifyWebhook(headers, rawBody);

    const isFirstDelivery = await this.recordEvent(provider, event);
    if (!isFirstDelivery) {
      this.logger.log(
        `Duplicate webhook ignored: ${provider}/${event.eventId} (${event.eventType})`,
      );
      return event;
    }

    this.logger.log(
      `Webhook received: ${event.eventType} from ${provider} (verified=${event.verified})`,
    );

    await this.settleTransaction(provider, event);

    // Log inbound webhook as an API call for the flow timeline
    this.apiCallLogService.logCall({
      flowId: event.chargeId || '',
      provider,
      direction: CallDirection.INBOUND_WEBHOOK,
      method: 'POST',
      endpoint: `/webhooks/${provider}`,
      requestHeaders: headers as unknown as Record<string, unknown>,
      requestBody: JSON.parse(rawBody),
      responseStatus: 200,
      durationMs: Date.now() - startTime,
    });

    this.broadcastSse(event);

    return event;
  }

  // Returns false when the provider is retrying an event we already stored.
  // The unique index is the arbiter, so concurrent deliveries cannot both win.
  private async recordEvent(
    provider: PaymentProvider,
    event: WebhookEvent,
  ): Promise<boolean> {
    try {
      // Cast needed because TypeORM cannot express a jsonb column as QueryDeepPartialEntity.
      await this.webhookEventRepo.insert({
        provider,
        eventId: event.eventId,
        eventType: event.eventType,
        chargeId: event.chargeId,
        refundId: event.refundId,
        payload: event.payload,
        verified: event.verified,
        receivedAt: new Date(),
      } as QueryDeepPartialEntity<WebhookEventEntity>);
      return true;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        return false;
      }
      throw err;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) {
      return false;
    }
    const driverError = err.driverError as { code?: string } | undefined;
    return driverError?.code === POSTGRES_UNIQUE_VIOLATION;
  }

  // Charge events only. Refund settlement is deliberately not handled here.
  private settlementStatus(eventType: WebhookEventType): PaymentStatus | null {
    switch (eventType) {
      case WebhookEventType.CHARGE_SUCCEEDED:
        return PaymentStatus.SUCCEEDED;
      case WebhookEventType.CHARGE_FAILED:
        return PaymentStatus.FAILED;
      case WebhookEventType.CHARGE_PENDING:
        return PaymentStatus.PROCESSING;
      default:
        return null;
    }
  }

  private async settleTransaction(
    provider: PaymentProvider,
    event: WebhookEvent,
  ): Promise<void> {
    const target = this.settlementStatus(event.eventType);
    if (!target || !event.chargeId) {
      return;
    }

    // Only statuses strictly behind the target may be overwritten. Expressed in the WHERE
    // clause rather than a read-then-write so two events racing cannot both apply.
    const overwritable = (Object.keys(STATUS_RANK) as PaymentStatus[]).filter(
      (status) => STATUS_RANK[status] < STATUS_RANK[target],
    );

    const result = await this.transactionRepo.update(
      {
        provider,
        externalId: event.chargeId,
        transactionType: TransactionType.CHARGE,
        status: In(overwritable),
      },
      { status: target },
    );

    if (result.affected) {
      this.logger.log(`Transaction ${event.chargeId} settled to ${target}`);
    } else {
      this.logger.log(
        `No forward settlement for ${event.chargeId}: already at or past ${target}`,
      );
    }
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
