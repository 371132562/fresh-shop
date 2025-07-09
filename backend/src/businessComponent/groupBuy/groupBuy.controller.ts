import { Controller, Post, Body } from '@nestjs/common';
import { GroupBuyService } from './groupBuy.service';
import { Prisma } from '@prisma/client';

import { GroupBuyPageParams } from '../../../types/dto';

@Controller('groupBuy')
export class GroupBuyController {
  constructor(private readonly groupBuyService: GroupBuyService) {}
  @Post('create')
  create(@Body() data: Prisma.GroupBuyCreateInput) {
    return this.groupBuyService.create(data);
  }

  @Post('update')
  update(@Body() data: { id: string } & Prisma.GroupBuyUpdateInput) {
    const { id, ...updateData } = data;
    return this.groupBuyService.update(id, updateData);
  }

  @Post('list')
  list(@Body() data: GroupBuyPageParams) {
    return this.groupBuyService.list(data);
  }

  @Post('detail')
  detail(@Body('id') id: string) {
    return this.groupBuyService.detail(id);
  }

  @Post('delete')
  delete(@Body('id') id: string) {
    return this.groupBuyService.delete(id);
  }

  @Post('deleteImage')
  async deleteImage(@Body() data: { id: string; filename: string }) {
    return this.groupBuyService.deleteImage(data.id, data.filename);
  }

  @Post('listAll')
  listAll() {
    return this.groupBuyService.listAll();
  }
}
