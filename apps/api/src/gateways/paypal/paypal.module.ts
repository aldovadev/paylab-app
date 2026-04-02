import { Module } from '@nestjs/common';
import { PaypalAdapter } from './paypal.adapter';
import { ApiCallLogModule } from '../../payment/api-call-log.module';

@Module({
  imports: [ApiCallLogModule],
  providers: [PaypalAdapter],
  exports: [PaypalAdapter],
})
export class PaypalModule { }
