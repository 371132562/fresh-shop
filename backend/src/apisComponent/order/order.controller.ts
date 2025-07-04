import { Controller, Post, Body } from '@nestjs/common';
import { OrderService } from './order.service';
import { Prisma } from '@prisma/client';

import { OrderPageParams } from '../../../types/dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @Post('create')
  create(@Body() data: Prisma.OrderCreateInput) {
    return this.orderService.create(data);
  }

  @Post('update')
  update(@Body() data: { id: string } & Prisma.OrderUpdateInput) {
    const { id, ...updateData } = data;
    return this.orderService.update(id, updateData);
  }

  @Post('list')
  list(@Body() data: OrderPageParams) {
    return this.orderService.list(data);
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.orderService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.orderService.delete(id);
  }

  @Post('listAll')
  listAll() {
    return this.orderService.listAll();
  }

  @Post('refund')
  refund(@Body('id') id: string) {
    return this.orderService.refund(id);
  }
}
