import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import {
  AnalysisCountParams,
  MergedGroupBuyOverviewParams,
  MergedGroupBuyOverviewDetailParams,
  MergedGroupBuyFrequencyCustomersParams,
  MergedGroupBuyRegionalCustomersParams,
  SupplierOverviewParams,
  SupplierOverviewDetailParams,
  SupplierFrequencyCustomersParams,
  SupplierRegionalCustomersParams,
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

  /**
   * 获取供货商概况数据
   * 提供供货商维度的概况分析接口，支持分页、搜索、排序等功能
   *
   * @param params 查询参数，包含时间范围、分页、搜索、排序等条件
   * @returns 供货商概况分页结果
   *
   * 接口功能：
   * - 按供货商维度统计销售、订单、客户等数据
   * - 支持按供货商名称搜索
   * - 支持多字段排序（销售额、利润、订单量等）
   * - 支持分页查询
   */
  @Post('supplierOverview')
  getSupplierOverview(@Body() params: SupplierOverviewParams) {
    return this.analysisService.getSupplierOverview(params);
  }

  /**
   * 获取供货商概况详情数据
   * 提供特定供货商的详细分析接口，包含多维度统计数据
   *
   * @param params 查询参数，包含供货商ID和时间范围
   * @returns 供货商详情数据，包含多维度分析结果
   *
   * 接口功能：
   * - 获取特定供货商的详细统计数据
   * - 包含核心业绩、客户分析、产品分析、地域分析等
   * - 提供团购历史记录和热销产品排行
   * - 支持时间范围过滤
   */
  @Post('supplierOverviewDetail')
  getSupplierOverviewDetail(@Body() params: SupplierOverviewDetailParams) {
    return this.analysisService.getSupplierOverviewDetail(params);
  }

  /**
   * 获取供货商特定购买频次的客户列表
   * 提供供货商维度下特定购买频次客户的查询接口
   *
   * @param params 查询参数，包含供货商ID、购买频次和时间范围
   * @returns 客户基本信息列表
   *
   * 接口功能：
   * - 查询指定供货商下特定购买频次的客户
   * - 支持时间范围过滤
   * - 返回客户基本信息用于进一步分析
   */
  @Post('supplierFrequencyCustomers')
  getSupplierFrequencyCustomers(
    @Body() params: SupplierFrequencyCustomersParams,
  ) {
    return this.analysisService.getSupplierFrequencyCustomers(params);
  }

  /**
   * 获取供货商特定区域的客户列表
   * 提供供货商维度下特定区域客户的查询接口
   *
   * @param params 查询参数，包含供货商ID、地址ID和时间范围
   * @returns 客户基本信息列表
   *
   * 接口功能：
   * - 查询指定供货商下特定地址的客户
   * - 支持时间范围过滤
   * - 返回客户基本信息用于进一步分析
   */
  @Post('supplierRegionalCustomers')
  getSupplierRegionalCustomers(
    @Body() params: SupplierRegionalCustomersParams,
  ) {
    return this.analysisService.getSupplierRegionalCustomers(params);
  }
}
