import { Controller, Post, Body } from '@nestjs/common';
import { GlobalSettingService } from './globalSetting.service';
import { Prisma } from '@prisma/client';

@Controller('globalSetting')
export class GlobalSettingController {
  constructor(private readonly productTypeService: GlobalSettingService) {}
  @Post('upsert')
  upsert(@Body() data: Prisma.GlobalSettingCreateInput) {
    return this.productTypeService.upsert(data);
  }

  @Post('detail')
  detail(@Body('key') key: string) {
    return this.productTypeService.detail(key);
  }
}
