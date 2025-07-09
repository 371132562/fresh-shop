import { Controller, Post, Body } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Prisma } from '@prisma/client';

import { CustomerPageParams } from '../../../types/dto';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}
  @Post('create')
  create(@Body() data: Prisma.CustomerCreateInput) {
    return this.customerService.create(data);
  }

  @Post('update')
  update(@Body() data: { id: string } & Prisma.CustomerUpdateInput) {
    const { id, ...updateData } = data;
    return this.customerService.update(id, updateData);
  }

  @Post('list')
  list(@Body() data: CustomerPageParams) {
    return this.customerService.list(data);
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.customerService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.customerService.delete(id);
  }

  @Post('listAll')
  listAll() {
    return this.customerService.listAll();
  }
}
