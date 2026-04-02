import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookEventEntity } from '../payment/entities/webhook-event.entity';
import { ApiCallLogModule } from '../payment/api-call-log.module';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEventEntity]),
    ApiCallLogModule,
    GatewaysModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule { }
