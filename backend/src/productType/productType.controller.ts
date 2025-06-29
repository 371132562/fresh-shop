import { Controller, Post, Body } from '@nestjs/common';
import { ProductTypeService } from './productType.service';
import { ProductType } from '@prisma/client';

import { ProductTypePageParams } from 'fresh-shop-common/types/dto';

@Controller('productType')
export class ProductTypeController {
  constructor(private readonly supplierService: ProductTypeService) {}
  @Post('create')
  create(@Body() data: ProductType) {
    return this.supplierService.create(data);
  }

  @Post('update')
  update(@Body() data: ProductType) {
    return this.supplierService.update(data.id, data);
  }

  @Post('list')
  list(@Body() data: ProductTypePageParams) {
    return this.supplierService.list(data);
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.supplierService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.supplierService.delete(id);
  }
}
