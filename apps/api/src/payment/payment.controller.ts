import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UseFilters,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  PaymentProvider,
  PaymentStatus,
  TransactionType,
} from '@paylab/shared';
import { PaymentService } from './payment.service';
import { CreateChargeDto, RefundDto } from './dtos';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@Controller('payments')
@ApiTags('Payment')
@UseInterceptors(ResponseInterceptor)
@UseFilters(HttpExceptionFilter)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('charge')
  @ApiOperation({ summary: 'Create a new charge/payment' })
  createCharge(@Body() dto: CreateChargeDto) {
    return this.paymentService.createCharge(dto);
  }

  @Get('charge/:provider/:chargeId')
  @ApiOperation({ summary: 'Get charge status' })
  getChargeStatus(
    @Param('provider') provider: PaymentProvider,
    @Param('chargeId') chargeId: string,
  ) {
    return this.paymentService.getChargeStatus(provider, chargeId);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund a charge (full or partial)' })
  refund(@Body() dto: RefundDto) {
    return this.paymentService.refund(dto);
  }

  @Post('capture/paypal/:orderId')
  @ApiOperation({ summary: 'Capture a PayPal order after buyer approval' })
  capturePaypalOrder(@Param('orderId') orderId: string) {
    return this.paymentService.capturePaypalOrder(orderId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List transaction history' })
  @ApiTags('Transactions')
  @ApiQuery({ name: 'provider', enum: PaymentProvider, required: false })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listTransactions(
    @Query('provider') provider?: PaymentProvider,
    @Query('type') type?: TransactionType,
    @Query('status') status?: PaymentStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentService.listTransactions({ provider, type, status, page, limit });
  }

  @Get('webhook-events')
  @ApiOperation({ summary: 'List webhook events' })
  @ApiTags('Webhooks')
  @ApiQuery({ name: 'provider', enum: PaymentProvider, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listWebhookEvents(
    @Query('provider') provider?: PaymentProvider,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentService.listWebhookEvents({ provider, page, limit });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get payment metrics by provider' })
  @ApiQuery({ name: 'provider', enum: PaymentProvider, required: false })
  getMetrics(@Query('provider') provider?: PaymentProvider) {
    return this.paymentService.getMetrics(provider);
  }
}
