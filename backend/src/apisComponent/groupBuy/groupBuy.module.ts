import { Module } from '@nestjs/common';
import { GroupBuyController } from './groupBuy.controller';
import { GroupBuyService } from './groupBuy.service';

@Module({
  controllers: [GroupBuyController],
  providers: [GroupBuyService],
  exports: [GroupBuyService],
})
export class GroupBuyModule {}
