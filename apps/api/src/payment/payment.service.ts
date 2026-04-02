import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentProvider,
  PaymentStatus,
  TransactionType,
  ChargeResult,
  ChargeStatusResult,
  RefundResult,
} from '@paylab/shared';
import { TransactionEntity } from './entities/transaction.entity';
import { WebhookEventEntity } from './entities/webhook-event.entity';
import { CreateChargeDto, RefundDto } from './dtos';
import { GatewayRegistryService } from '../gateways/gateway-registry.service';
import { PaypalAdapter } from '../gateways/paypal/paypal.adapter';
import { ApiCallLogService } from './api-call-log.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepo: Repository<WebhookEventEntity>,
    private readonly gatewayRegistry: GatewayRegistryService,
    private readonly apiCallLogService: ApiCallLogService,
  ) { }

  async createCharge(dto: CreateChargeDto): Promise<ChargeResult> {
    const adapter = this.gatewayRegistry.getAdapter(dto.provider);

    const result = await adapter.createCharge({
      provider: dto.provider,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      testPaymentMethod: dto.testPaymentMethod,
      description: dto.description,
      metadata: dto.metadata,
      returnUrl: dto.returnUrl,
    });

    await this.transactionRepo.save({
      provider: dto.provider,
      transactionType: TransactionType.CHARGE,
      status: result.status,
      externalId: result.chargeId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      description: dto.description,
      rawResponse: result.rawResponse,
      metadata: dto.metadata,
    });

    this.logger.log(`Charge created: ${result.chargeId} via ${dto.provider}`);
    return result;
  }

  async getChargeStatus(provider: PaymentProvider, chargeId: string): Promise<ChargeStatusResult> {
    const adapter = this.gatewayRegistry.getAdapter(provider);
    return adapter.getChargeStatus(chargeId);
  }

  async capturePaypalOrder(orderId: string): Promise<ChargeResult> {
    const adapter = this.gatewayRegistry.getAdapter(PaymentProvider.PAYPAL) as PaypalAdapter;

    // Retrieve stored transaction to get mock code from metadata
    const transaction = await this.transactionRepo.findOne({
      where: { externalId: orderId },
    });
    const mockCode = (transaction?.metadata as Record<string, string>)?.paypalMockCode;

    const result = await adapter.captureOrder(orderId, mockCode);

    // Update existing transaction with captured status
    await this.transactionRepo.update(
      { externalId: orderId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { status: result.status, rawResponse: result.rawResponse } as any,
    );

    this.logger.log(`PayPal order captured: ${orderId} status=${result.status}`);
    return result;
  }

  async refund(dto: RefundDto): Promise<RefundResult> {
    const adapter = this.gatewayRegistry.getAdapter(dto.provider);

    const result = await adapter.refund({
      chargeId: dto.chargeId,
      provider: dto.provider,
      amount: dto.amount,
      reason: dto.reason,
    });

    await this.transactionRepo.save({
      provider: dto.provider,
      transactionType: TransactionType.REFUND,
      status: result.status,
      externalId: result.refundId,
      relatedChargeId: dto.chargeId,
      amount: result.amount,
      currency: result.currency,
      description: dto.reason,
      rawResponse: result.rawResponse,
    });

    this.logger.log(`Refund created: ${result.refundId} for charge ${dto.chargeId}`);
    return result;
  }

  async listTransactions(query: {
    provider?: PaymentProvider;
    type?: TransactionType;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.transactionRepo.createQueryBuilder('t');

    if (query.provider) {
      qb.andWhere('t.provider = :provider', { provider: query.provider });
    }
    if (query.type) {
      qb.andWhere('t.transactionType = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    qb.orderBy('t.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      pagination: {
        page,
        limit,
        totalData: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listWebhookEvents(query: {
    provider?: PaymentProvider;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.webhookEventRepo.createQueryBuilder('w');

    if (query.provider) {
      qb.andWhere('w.provider = :provider', { provider: query.provider });
    }

    qb.orderBy('w.receivedAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      pagination: {
        page,
        limit,
        totalData: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMetrics(provider?: PaymentProvider) {
    const qb = this.transactionRepo.createQueryBuilder('t')
      .select('t.provider', 'provider')
      .addSelect('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'totalAmount')
      .groupBy('t.provider')
      .addGroupBy('t.status');

    if (provider) {
      qb.where('t.provider = :provider', { provider });
    }

    const raw = await qb.getRawMany();

    const metrics: Record<string, {
      total: number;
      succeeded: number;
      failed: number;
      pending: number;
      totalVolume: number;
      successRate: number;
    }> = {};

    for (const row of raw) {
      if (!metrics[row.provider]) {
        metrics[row.provider] = {
          total: 0,
          succeeded: 0,
          failed: 0,
          pending: 0,
          totalVolume: 0,
          successRate: 0,
        };
      }
      const m = metrics[row.provider];
      const count = parseInt(row.count, 10);
      m.total += count;
      m.totalVolume += parseFloat(row.totalAmount);

      if (row.status === PaymentStatus.SUCCEEDED) m.succeeded += count;
      else if (row.status === PaymentStatus.FAILED) m.failed += count;
      else m.pending += count;
    }

    for (const key of Object.keys(metrics)) {
      const m = metrics[key];
      m.successRate = m.total > 0 ? (m.succeeded / m.total) * 100 : 0;
    }

    return metrics;
  }

  async getFlowSummary(externalId: string) {
    // Primary transaction
    const transaction = await this.transactionRepo.findOne({
      where: { externalId },
    });

    // Related transactions (refunds linked to this charge)
    const relatedTransactions = await this.transactionRepo.find({
      where: { relatedChargeId: externalId },
      order: { createdAt: 'ASC' },
    });

    // API call logs for this flow
    const apiCalls = await this.apiCallLogService.getFlowLogs(externalId);

    // Webhook events for this charge
    const webhookEvents = await this.webhookEventRepo.find({
      where: { chargeId: externalId },
      order: { receivedAt: 'ASC' },
    });

    return {
      transaction,
      relatedTransactions,
      apiCalls,
      webhookEvents,
    };
  }
}
