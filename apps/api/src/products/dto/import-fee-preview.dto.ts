import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ImportFeePreviewDto {
  /** Raw Fee Preview file contents (tab- or comma-delimited). */
  @IsString()
  @MinLength(10)
  text!: string;

  /** When true, run detect for each imported SKU after upsert. Default false. */
  @IsOptional()
  @IsBoolean()
  runDetect?: boolean;
}
