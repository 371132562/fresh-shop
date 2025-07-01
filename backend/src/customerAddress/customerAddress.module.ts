import { Module } from '@nestjs/common';
import { CustomerAddressController } from './customerAddress.controller';
import { CustomerAddressService } from './customerAddress.service';

@Module({
  controllers: [CustomerAddressController],
  providers: [CustomerAddressService],
})
export class CustomerAddressModule {}
