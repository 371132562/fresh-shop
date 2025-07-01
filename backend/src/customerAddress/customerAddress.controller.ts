import { Controller, Post, Body } from '@nestjs/common';
import { CustomerAddressService } from './customerAddress.service';
import { CustomerAddress } from '@prisma/client';

import { CustomerAddressPageParams } from '../../types/dto';

@Controller('customerAddress')
export class CustomerAddressController {
  constructor(
    private readonly customerAddressService: CustomerAddressService,
  ) {}
  @Post('create')
  create(@Body() data: CustomerAddress) {
    return this.customerAddressService.create(data);
  }

  @Post('update')
  update(@Body() data: CustomerAddress) {
    return this.customerAddressService.update(data.id, data);
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
}
