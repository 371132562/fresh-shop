import { Controller, Post, Logger } from '@nestjs/common';
import { MigrationService } from './migration.service';

@Controller('migration')
export class MigrationController {
  private readonly logger = new Logger(MigrationController.name);

  constructor(private readonly migrationService: MigrationService) {}

  @Post('deduplicate-images')
  async deduplicateImages() {
    this.logger.log('接收到去重历史图片的请求...');
    // 这个过程可能会很长，所以是异步的
    const result = await this.migrationService.deduplicateImages();
    this.logger.log('图片去重处理完成。');
    return result;
  }
}
