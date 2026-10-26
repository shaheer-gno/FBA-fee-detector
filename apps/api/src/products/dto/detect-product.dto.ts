import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class DetectProductDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chargedFeeUsd!: number;

  /** Defaults to today when omitted. */
  @IsOptional()
  @IsDateString()
  feeDate?: string;

  /** Defaults to the product’s stored selling price. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPriceUsd?: number;
}
