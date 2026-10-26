import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { FEE_CATEGORIES, type FeeCategory } from '../../detections/fee/constants';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  sku!: string;

  @IsOptional()
  @IsString()
  asin?: string | null;

  @IsOptional()
  @IsString()
  title?: string | null;

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

  /** Amazon charged FBA fee (manual until SP-API). Required on create. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lastChargedFeeUsd!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
