import { Controller, Post, Body } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from '@prisma/client';

import { ProductPageParams } from '../../types/dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Post('create')
  create(@Body() data: Product) {
    return this.productService.create(data);
  }

  @Post('update')
  update(@Body() data: Product) {
    return this.productService.update(data.id, data);
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
}
