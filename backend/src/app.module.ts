import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupplierModule } from './supplier/supplier.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [SupplierModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
