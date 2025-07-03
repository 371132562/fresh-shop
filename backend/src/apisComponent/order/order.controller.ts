import { Controller, Post, Body } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order } from '@prisma/client';

import { OrderPageParams } from '../../../types/dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @Post('create')
  create(@Body() data: Order) {
    return this.orderService.create(data);
  }

  @Post('update')
  update(@Body() data: Order) {
    return this.orderService.update(data.id, data);
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
