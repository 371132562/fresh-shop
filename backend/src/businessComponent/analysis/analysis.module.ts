import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { CustomerService } from '../customer/customer.service';
import { CustomerAddressService } from '../customerAddress/customerAddress.service';
import { SupplierService } from '../supplier/supplier.service';
import { GroupBuyService } from '../groupBuy/groupBuy.service';
import { UploadService } from '../../upload/upload.service';

@Module({
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    CustomerService,
    CustomerAddressService,
    SupplierService,
    GroupBuyService,
    UploadService,
  ],
})
export class AnalysisModule {}
