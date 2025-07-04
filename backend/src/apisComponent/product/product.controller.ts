import { Controller, Post, Body } from '@nestjs/common';
import { ProductService } from './product.service';
import { Prisma } from '@prisma/client';

import { ProductPageParams } from '../../../types/dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Post('create')
  create(@Body() data: Prisma.ProductCreateInput) {
    return this.productService.create(data);
  }

  @Post('update')
  update(@Body() data: { id: string } & Prisma.ProductUpdateInput) {
    const { id, ...updateData } = data;
    return this.productService.update(id, updateData);
  }

  @Post('list')
  list(@Body() data: ProductPageParams) {
    return this.productService.list(data);
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.productService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.productService.delete(id);
  }

  @Post('listAll')
  listAll() {
    return this.productService.listAll();
  }
}
