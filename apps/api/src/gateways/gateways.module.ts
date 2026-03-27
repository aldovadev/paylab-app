import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { PaypalModule } from './paypal/paypal.module';
import { GatewayRegistryService } from './gateway-registry.service';

@Module({
  imports: [StripeModule, PaypalModule],
  providers: [GatewayRegistryService],
  exports: [GatewayRegistryService, StripeModule, PaypalModule],
})
export class GatewaysModule {}
