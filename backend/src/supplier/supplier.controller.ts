import { Controller, Post, Body } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { Supplier } from '@prisma/client';

import { SupplierPageParams } from 'fresh-shop-common/types/dto';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}
  @Post('create')
  create(@Body() data: Supplier) {
    return this.supplierService.create(data);
  }

  @Post('update')
  update(@Body() data: Supplier) {
    return this.supplierService.update(data.id, data);
  }

  @Post('list')
  list(@Body() data: SupplierPageParams) {
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

  @Post('deleteImage')
  async deleteImage(@Body() data: { id: string; filename: string }) {
    return this.supplierService.deleteImage(data.id, data.filename);
  }
}
