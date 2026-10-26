import { Module, forwardRef } from '@nestjs/common';
import { DetectionsModule } from '../detections/detections.module';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [forwardRef(() => DetectionsModule)],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
