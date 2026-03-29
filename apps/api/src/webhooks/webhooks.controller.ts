import {
  Controller,
  Post,
  Get,
  Param,
  Headers,
  Req,
  Res,
  RawBodyRequest,
  UseFilters,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { PaymentProvider } from '@paylab/shared';
import { WebhooksService } from './webhooks.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@Controller('webhooks')
@ApiTags('Webhooks')
@UseFilters(HttpExceptionFilter)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':provider')
  @ApiOperation({ summary: 'Receive webhook from payment provider (Stripe/PayPal)' })
  async receiveWebhook(
    @Param('provider') provider: PaymentProvider,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);
    return this.webhooksService.handleWebhook(provider, headers, rawBody);
  }

  @Get('events/stream')
  @ApiOperation({ summary: 'SSE stream for real-time webhook events' })
  streamEvents(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const clientId = randomUUID();
    this.webhooksService.addSseClient(clientId, res);

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);
  }
}
