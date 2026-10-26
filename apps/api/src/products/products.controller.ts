import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  forwardRef,
} from '@nestjs/common';
import { DetectionsService } from '../detections/detections.service';
import { CreateProductDto } from './dto/create-product.dto';
import { DetectProductDto } from './dto/detect-product.dto';
import { ImportAmazonReportsDto } from './dto/import-amazon-reports.dto';
import { ImportFeePreviewDto } from './dto/import-fee-preview.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => DetectionsService))
    private readonly detectionsService: DetectionsService,
  ) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('verdict') verdict?: string,
  ) {
    return this.productsService.listPage(page, pageSize, verdict);
  }

  /** Must be registered before :id routes. */
  @Post('import/fee-preview')
  importFeePreview(@Body() dto: ImportFeePreviewDto) {
    return this.productsService.importFeePreview(dto);
  }

  @Post('import/amazon-reports')
  importAmazonReports(@Body() dto: ImportAmazonReportsDto) {
    return this.productsService.importAmazonReports(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.get(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  @Post(':id/detect')
  detect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DetectProductDto,
  ) {
    return this.detectionsService.detectProduct(id, dto);
  }
}
