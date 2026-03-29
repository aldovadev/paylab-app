import { Entity, Column, Index } from 'typeorm';
import { EditableBaseEntity } from '../../database/base-entity';
import {
  PaymentProvider,
  WebhookEventType,
} from '@paylab/shared';

@Entity('webhook_events')
export class WebhookEventEntity extends EditableBaseEntity {
  @Column({ type: 'enum', enum: PaymentProvider, name: 'provider' })
  @Index()
  provider: PaymentProvider;

  @Column({ type: 'varchar', name: 'event_id' })
  eventId: string;

  @Column({ type: 'enum', enum: WebhookEventType, name: 'event_type' })
  @Index()
  eventType: WebhookEventType;

  @Column({ type: 'varchar', nullable: true, name: 'charge_id' })
  chargeId?: string;

  @Column({ type: 'varchar', nullable: true, name: 'refund_id' })
  refundId?: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload: Record<string, unknown>;

  @Column({ type: 'boolean', default: false, name: 'verified' })
  verified: boolean;

  @Column({ type: 'timestamptz', name: 'received_at' })
  receivedAt: Date;
}
