import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GlobalSetting, Prisma } from '@prisma/client';

@Injectable()
export class GlobalSettingService {
  constructor(private prisma: PrismaService) {}

  async upsert(data: Prisma.GlobalSettingCreateInput): Promise<GlobalSetting> {
    const { key, value } = data;
    return this.prisma.globalSetting.upsert({
      where: {
        key,
      },
      create: {
        key,
        value,
      },
      update: {
        value,
      },
    });
  }

  async detail(key: string): Promise<GlobalSetting | null> {
    return this.prisma.globalSetting.findUnique({
      where: {
        key,
      },
    });
  }
}
