import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { CustomerService } from '../customer/customer.service';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, CustomerService],
})
export class AnalysisModule {}
