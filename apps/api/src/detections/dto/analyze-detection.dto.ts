import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { FEE_CATEGORIES, type FeeCategory } from '../fee/constants';

export class AnalyzeDetectionDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  lengthIn!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  widthIn!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  heightIn!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  unitWeightOz!: number;

  @IsIn([...FEE_CATEGORIES])
  category!: FeeCategory;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPriceUsd!: number;

  /** Date the fulfillment fee applies (defaults to today on the client). */
  @IsDateString()
  feeDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chargedFeeUsd!: number;
}
