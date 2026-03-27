import { Module } from '@nestjs/common';
import { PaypalAdapter } from './paypal.adapter';

@Module({
  providers: [PaypalAdapter],
  exports: [PaypalAdapter],
})
export class PaypalModule {}
