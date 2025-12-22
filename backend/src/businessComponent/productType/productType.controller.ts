import { Controller, Post, Body } from '@nestjs/common';
import { ProductTypeService } from './productType.service';
import { Prisma } from '@prisma/client';

import {
  ProductTypePageParams,
  ProductTypeMigratePreviewParams,
  ProductTypeMigrateParams,
} from '../../../types/dto';

@Controller('productType')
export class ProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}
  @Post('create')
  create(@Body() data: Prisma.ProductTypeCreateInput) {
    return this.productTypeService.create(data);
  }

  @Post('update')
  update(@Body() data: { id: string } & Prisma.ProductTypeUpdateInput) {
    const { id: _id, ...updateData } = data;
    return this.productTypeService.update(data.id, updateData);
  }

  @Post('list')
  list(@Body() data: ProductTypePageParams) {
    return this.productTypeService.list(data);
  }

  @Post('listAll')
  listAll() {
    return this.productTypeService.listAll();
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.productTypeService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.productTypeService.delete(id);
  }

  @Post('migratePreview')
  migratePreview(@Body() data: ProductTypeMigratePreviewParams) {
    return this.productTypeService.migratePreview(data);
  }

  @Post('migrate')
  migrate(@Body() data: ProductTypeMigrateParams) {
    return this.productTypeService.migrate(data);
  }
}
