import { Module } from '@nestjs/common';
import { ProductTypeController } from './productType.controller';
import { ProductTypeService } from './productType.service';

@Module({
  controllers: [ProductTypeController],
  providers: [ProductTypeService],
})
export class ProductTypeModule {}
