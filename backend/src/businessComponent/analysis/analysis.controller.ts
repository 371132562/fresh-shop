import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import {
  AnalysisCountParams,
  MergedGroupBuyOverviewParams,
  MergedGroupBuyOverviewDetailParams,
  MergedGroupBuyFrequencyCustomersParams,
  MergedGroupBuyRegionalCustomersParams,
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
    @Body() params: MergedGroupBuyOverviewDetailParams,
  ) {
    return this.analysisService.getMergedGroupBuyOverviewDetail(params);
  }

  /**
   * 获取特定购买频次的客户列表
   */
  @Post('mergedGroupBuyFrequencyCustomers')
  getMergedGroupBuyFrequencyCustomers(
    @Body() params: MergedGroupBuyFrequencyCustomersParams,
  ) {
    return this.analysisService.getMergedGroupBuyFrequencyCustomers(params);
  }

  /**
   * 获取特定区域的客户列表
   */
  @Post('mergedGroupBuyRegionalCustomers')
  getMergedGroupBuyRegionalCustomers(
    @Body() params: MergedGroupBuyRegionalCustomersParams,
  ) {
    return this.analysisService.getMergedGroupBuyRegionalCustomers(params);
  }
}
