import { Entity, Column, Index } from 'typeorm';
import { EditableBaseEntity } from '../../database/base-entity';
import { PaymentProvider } from '@paylab/shared';

@Entity('api_call_logs')
export class ApiCallLogEntity extends EditableBaseEntity {
  @Column({ type: 'varchar', name: 'flow_id' })
  @Index()
  flowId: string;

  @Column({ type: 'enum', enum: PaymentProvider, name: 'provider' })
  @Index()
  provider: PaymentProvider;

  // 'outbound' or 'inbound_webhook'
  @Column({ type: 'varchar', name: 'direction' })
  direction: string;

  // HTTP method: GET, POST, etc.
  @Column({ type: 'varchar', name: 'method' })
  method: string;

  // API endpoint path (e.g. /v2/checkout/orders)
  @Column({ type: 'varchar', name: 'endpoint' })
  endpoint: string;

  @Column({ type: 'jsonb', nullable: true, name: 'request_headers' })
  requestHeaders?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true, name: 'request_body' })
  requestBody?: Record<string, unknown>;

  @Column({ type: 'int', nullable: true, name: 'response_status' })
  responseStatus?: number;

  @Column({ type: 'jsonb', nullable: true, name: 'response_headers' })
  responseHeaders?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true, name: 'response_body' })
  responseBody?: Record<string, unknown>;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs?: number;
}
