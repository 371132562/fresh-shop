import { Controller, Post, Body } from '@nestjs/common';
import { CustomerAddressService } from './customerAddress.service';
import { Prisma } from '@prisma/client';

import { CustomerAddressPageParams } from '../../../types/dto';

@Controller('customerAddress')
export class CustomerAddressController {
  constructor(
    private readonly customerAddressService: CustomerAddressService,
  ) {}
  @Post('create')
  create(@Body() data: Prisma.CustomerAddressCreateInput) {
    return this.customerAddressService.create(data);
  }

  @Post('update')
  update(@Body() data: { id: string } & Prisma.CustomerAddressUpdateInput) {
    const { id, ...updateData } = data;
    return this.customerAddressService.update(id, updateData);
  }

  @Post('list')
  list(@Body() data: CustomerAddressPageParams) {
    return this.customerAddressService.list(data);
  }

  @Post('listAll')
  listAll() {
    return this.customerAddressService.listAll();
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.customerAddressService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.customerAddressService.delete(id);
  }

  @Post('consumptionDetail')
  consumptionDetail(@Body('id') id: string) {
    return this.customerAddressService.getConsumptionDetail(id);
  }
}
