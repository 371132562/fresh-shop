import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisCountParams } from '../../../types/dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}
  @Post('count')
  count(@Body() data: AnalysisCountParams) {
    return this.analysisService.count(data);
  }
}
