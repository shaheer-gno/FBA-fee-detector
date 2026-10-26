import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DailyChargeDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sku?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chargedFeeUsd!: number;
}

export class RunDailyDto {
  @IsOptional()
  @IsDateString()
  feeDate?: string;

  /** Optional overrides. Active products otherwise use lastChargedFeeUsd. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyChargeDto)
  charges?: DailyChargeDto[];
}
