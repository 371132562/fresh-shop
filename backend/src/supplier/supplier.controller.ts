import { Controller, Post, Body } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { Supplier } from '@prisma/client';

import { PageParams } from 'fresh-shop-common/types/dto';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}
  @Post('create')
  create(@Body() supplierData: Supplier) {
    return this.supplierService.create(supplierData);
  }

  @Post('list')
  list(@Body() pageParams: PageParams) {
    return this.supplierService.list(pageParams);
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    console.log(id);
    return this.supplierService.detail(id);
  }
}
