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

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  sku?: string;

  @IsOptional()
  @IsString()
  asin?: string | null;

  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  lengthIn?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  widthIn?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  heightIn?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  unitWeightOz?: number;

  @IsOptional()
  @IsIn([...FEE_CATEGORIES])
  category?: FeeCategory;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPriceUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lastChargedFeeUsd?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
