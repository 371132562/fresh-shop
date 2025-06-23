import { Controller, Post, Body } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { Supplier } from '@prisma/client';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}
  @Post('create')
  create(@Body() supplierData: Supplier) {
    return this.supplierService.create(supplierData);
  }
}
