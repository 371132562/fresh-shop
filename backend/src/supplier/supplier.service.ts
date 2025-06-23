import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Supplier } from '@prisma/client';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  async create(data: Supplier): Promise<{ id: string }> {
    return await this.prisma.supplier.create({ data });
  }
}
