import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import {
  PaymentProvider,
  PaymentMethod,
} from '@pay-gate-simulator/shared';

export class CreateChargeDto {
  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({ example: 100.0, description: 'Amount in major unit (e.g. dollars)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'USD', maxLength: 3 })
  @IsString()
  @MaxLength(3)
  currency: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'pm_card_visa', description: 'Stripe test PaymentMethod token' })
  @IsString()
  @IsOptional()
  testPaymentMethod?: string;

  @ApiPropertyOptional({ example: 'Test charge' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: Object })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({ example: 'http://localhost:3000/return' })
  @IsString()
  @IsOptional()
  returnUrl?: string;
}

export class RefundDto {
  @ApiProperty({ description: 'The charge ID to refund' })
  @IsString()
  chargeId: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiPropertyOptional({ description: 'Amount to refund (partial). Full refund if omitted.' })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 'Customer request' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class GetChargeStatusDto {
  @ApiProperty({ description: 'The charge/external ID' })
  @IsString()
  chargeId: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
