import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AmazonReportFileDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(10)
  text!: string;
}

export class ImportAmazonReportsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AmazonReportFileDto)
  files!: AmazonReportFileDto[];

  /** Fee date for auto detect after import (YYYY-MM-DD). */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  feeDate?: string;
}
