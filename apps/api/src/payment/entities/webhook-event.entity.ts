import { Entity, Column, Index, Unique } from 'typeorm';
import { EditableBaseEntity } from '../../database/base-entity';
import {
  PaymentProvider,
  WebhookEventType,
} from '@paylab/shared';

// Providers retry webhooks until they get a 2xx, so the same event_id arrives more than once.
// Scoped by provider because event ids are only unique within a provider.
@Entity('webhook_events')
@Unique('uq_webhook_events_provider_event_id', ['provider', 'eventId'])
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
