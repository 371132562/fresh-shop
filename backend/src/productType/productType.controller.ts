import { Controller, Post, Body } from '@nestjs/common';
import { ProductTypeService } from './productType.service';
import { ProductType } from '@prisma/client';

import { ProductTypePageParams } from 'fresh-shop-common/types/dto';

@Controller('productType')
export class ProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}
  @Post('create')
  create(@Body() data: ProductType) {
    return this.productTypeService.create(data);
  }

  @Post('update')
  update(@Body() data: ProductType) {
    return this.productTypeService.update(data.id, data);
  }

  @Post('list')
  list(@Body() data: ProductTypePageParams) {
    return this.productTypeService.list(data);
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.productTypeService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.productTypeService.delete(id);
  }
}
