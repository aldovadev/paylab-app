import { Module } from '@nestjs/common';
import { StripeAdapter } from './stripe.adapter';
import { ApiCallLogModule } from '../../payment/api-call-log.module';

@Module({
  imports: [ApiCallLogModule],
  providers: [StripeAdapter],
  exports: [StripeAdapter],
})
export class StripeModule { }
