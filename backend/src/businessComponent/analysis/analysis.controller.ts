import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import {
  AnalysisCountParams,
  MergedGroupBuyCustomerRankParams,
  MergedGroupBuyOverviewParams,
} from '../../../types/dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('count')
  count(@Body() data: AnalysisCountParams) {
    return this.analysisService.count(data);
  }

  /**
   * 获取团购单排行数据
   */
  @Post('groupBuyRank')
  getGroupBuyRank(@Body() params: AnalysisCountParams) {
    return this.analysisService.getGroupBuyRank(params);
  }

  /**
   * 获取团购单（合并）排行数据
   */
  @Post('mergedGroupBuyRank')
  getMergedGroupBuyRank(@Body() params: AnalysisCountParams) {
    return this.analysisService.getMergedGroupBuyRank(params);
  }

  /**
   * 获取客户排行数据
   */
  @Post('customerRank')
  getCustomerRank(@Body() params: AnalysisCountParams) {
    return this.analysisService.getCustomerRank(params);
  }

  /**
   * 获取供货商排行数据
   */
  @Post('supplierRank')
  getSupplierRank(@Body() params: AnalysisCountParams) {
    return this.analysisService.getSupplierRank(params);
  }

  /**
   * 获取合并团购单的客户排行数据
   */
  @Post('mergedGroupBuyCustomerRank')
  getMergedGroupBuyCustomerRank(
    @Body() params: MergedGroupBuyCustomerRankParams,
  ) {
    return this.analysisService.getMergedGroupBuyCustomerRank(params);
  }

  /**
   * 获取团购单（合并）概况数据
   */
  @Post('mergedGroupBuyOverview')
  getMergedGroupBuyOverview(@Body() params: MergedGroupBuyOverviewParams) {
    return this.analysisService.getMergedGroupBuyOverview(params);
  }

  /**
   * 获取团购单（合并）概况详情数据
   */
  @Post('mergedGroupBuyOverviewDetail')
  getMergedGroupBuyOverviewDetail(
    @Body() params: { groupBuyName: string; startDate: Date; endDate: Date },
  ) {
    return this.analysisService.getMergedGroupBuyOverviewDetail(params);
  }
}
