import { Entity, Column, Index } from 'typeorm';
import { EditableBaseEntity } from '../../database/base-entity';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
} from '@pay-gate-simulator/shared';

@Entity('transactions')
export class TransactionEntity extends EditableBaseEntity {
  @Column({ type: 'enum', enum: PaymentProvider, name: 'provider' })
  @Index()
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: TransactionType, name: 'transaction_type' })
  @Index()
  transactionType: TransactionType;

  @Column({ type: 'enum', enum: PaymentStatus, name: 'status' })
  @Index()
  status: PaymentStatus;

  @Column({ type: 'varchar', name: 'external_id', nullable: true })
  externalId?: string;

  @Column({ type: 'varchar', name: 'related_charge_id', nullable: true })
  relatedChargeId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'amount' })
  amount: number;

  @Column({ type: 'varchar', length: 3, name: 'currency', default: 'USD' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true, name: 'payment_method' })
  paymentMethod?: PaymentMethod;

  @Column({ type: 'varchar', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_request' })
  rawRequest?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_response' })
  rawResponse?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata?: Record<string, string>;
}
