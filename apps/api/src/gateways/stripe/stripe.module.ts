import { Module } from '@nestjs/common';
import { StripeAdapter } from './stripe.adapter';

@Module({
  providers: [StripeAdapter],
  exports: [StripeAdapter],
})
export class StripeModule {}
