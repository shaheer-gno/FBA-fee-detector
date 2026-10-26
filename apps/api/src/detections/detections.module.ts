import { Module, forwardRef } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { DetectionsController } from './detections.controller';
import { DetectionsRepository } from './detections.repository';
import { DetectionsService } from './detections.service';
import { FeeCalculationService } from './fee/fee-calculation.service';
import { FeeSettingsRepository } from './fee/fee-settings.repository';
import { FeeSettingsService } from './fee/fee-settings.service';

@Module({
  imports: [forwardRef(() => ProductsModule)],
  controllers: [DetectionsController],
  providers: [
    DetectionsService,
    FeeCalculationService,
    FeeSettingsService,
    FeeSettingsRepository,
    DetectionsRepository,
  ],
  exports: [DetectionsService, FeeSettingsService],
})
export class DetectionsModule {}
