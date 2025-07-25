import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { UploadModule } from '../../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [SupplierController],
  providers: [SupplierService],
})
export class SupplierModule {}
