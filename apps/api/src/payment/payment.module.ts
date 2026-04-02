import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { TransactionEntity } from './entities/transaction.entity';
import { WebhookEventEntity } from './entities/webhook-event.entity';
import { ApiCallLogEntity } from './entities/api-call-log.entity';
import { ApiCallLogModule } from './api-call-log.module';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity, WebhookEventEntity, ApiCallLogEntity]),
    ApiCallLogModule,
    GatewaysModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule { }
