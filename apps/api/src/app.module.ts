import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { PaymentModule } from './payment/payment.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { GatewaysModule } from './gateways/gateways.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validationSchema: Joi.object({
        APP_NAME: Joi.string().default('paylab'),
        APP_ENV: Joi.string().valid('dev', 'staging', 'production').default('dev'),
        APP_PORT: Joi.number().default(3100),
        ENABLE_SWAGGER: Joi.string().default('true'),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().default('postgres'),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().default('pay_gate_simulator'),
        DB_SSL: Joi.string().default('false'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        ENABLE_GOOGLE_AUTH: Joi.string().valid('true', 'false').default('false'),
        GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
        GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
        GOOGLE_CALLBACK_URL: Joi.string().default('http://localhost:3100/api/auth/google/callback'),
        JWT_SECRET: Joi.string().default('dev-jwt-secret'),
        FRONTEND_URL: Joi.string().default('http://localhost:3200'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: config.get('APP_ENV') === 'dev',
        logging: config.get('APP_ENV') === 'dev' ? ['error'] : false,
      }),
    }),
    GatewaysModule,
    PaymentModule,
    WebhooksModule,
    AuthModule,
  ],
})
export class AppModule { }
