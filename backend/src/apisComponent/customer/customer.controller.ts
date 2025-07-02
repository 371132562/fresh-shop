import { Controller, Post, Body } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Customer } from '@prisma/client';

import { CustomerPageParams } from '../../../types/dto';

@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}
  @Post('create')
  create(@Body() data: Customer) {
    return this.customerService.create(data);
  }

  @Post('update')
  update(@Body() data: Customer) {
    return this.customerService.update(data.id, data);
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
}
