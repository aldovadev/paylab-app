import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentProvider, PaymentGatewayAdapter } from '@paylab/shared';
import { StripeAdapter } from './stripe/stripe.adapter';
import { PaypalAdapter } from './paypal/paypal.adapter';

@Injectable()
export class GatewayRegistryService {
  private readonly adapters = new Map<PaymentProvider, PaymentGatewayAdapter>();

  constructor(
    private readonly stripeAdapter: StripeAdapter,
    private readonly paypalAdapter: PaypalAdapter,
  ) {
    this.adapters.set(PaymentProvider.STRIPE, stripeAdapter);
    this.adapters.set(PaymentProvider.PAYPAL, paypalAdapter);
  }

  getAdapter(provider: PaymentProvider): PaymentGatewayAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new BadRequestException(`No adapter registered for provider: ${provider}`);
    }
    return adapter;
  }

  listProviders(): PaymentProvider[] {
    return Array.from(this.adapters.keys());
  }
}
