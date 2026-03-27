import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT', 3100);
  const enableSwagger = configService.get<string>('ENABLE_SWAGGER', 'true');

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (enableSwagger === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Pay Gate Simulator')
      .setDescription('Multi-gateway payment simulator API')
      .setVersion('0.1.0')
      .addTag('Payment', 'Create charges, refunds, and disbursements')
      .addTag('Webhooks', 'Webhook event receiver and simulator')
      .addTag('Gateway Config', 'Manage payment gateway configurations')
      .addTag('Transactions', 'View transaction history')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
}
bootstrap();
