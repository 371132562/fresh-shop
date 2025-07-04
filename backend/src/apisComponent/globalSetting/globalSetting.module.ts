import { Module } from '@nestjs/common';
import { GlobalSettingController } from './globalSetting.controller';
import { GlobalSettingService } from './globalSetting.service';

@Module({
  controllers: [GlobalSettingController],
  providers: [GlobalSettingService],
})
export class GlobalSettingModule {}
