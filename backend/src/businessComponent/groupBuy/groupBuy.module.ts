import { Module } from '@nestjs/common';
import { GroupBuyService } from './groupBuy.service';
import { GroupBuyController } from './groupBuy.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { UploadModule } from '../../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [GroupBuyController],
  providers: [GroupBuyService],
})
export class GroupBuyModule {}
