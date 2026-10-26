import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AnalyzeDetectionDto } from './dto/analyze-detection.dto';
import { RunDailyDto } from './dto/run-daily.dto';
import { DetectionsService } from './detections.service';

@Controller('detections')
export class DetectionsController {
  constructor(private readonly detectionsService: DetectionsService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeDetectionDto) {
    return this.detectionsService.analyze(dto);
  }

  @Post('run-daily')
  runDaily(@Body() dto: RunDailyDto) {
    return this.detectionsService.runDaily(dto);
  }

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('productId') productId?: string,
    @Query('verdict') verdict?: string,
  ) {
    return this.detectionsService.listPage(
      page,
      pageSize,
      productId,
      verdict,
    );
  }
}
