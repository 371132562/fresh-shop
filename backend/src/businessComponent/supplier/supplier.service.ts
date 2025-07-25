import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Supplier } from '@prisma/client';

import {
  SupplierPageParams,
  ListByPage,
  SupplierListItem,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { UploadService } from '../../upload/upload.service';

@Injectable()
export class SupplierService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
    const { name, phone, wechat } = data;
    const existingSupplier = await this.prisma.supplier.findFirst({
      where: {
        delete: 0,
        OR: [{ name: name }, { phone: phone }, { wechat: wechat }],
      },
    });

    if (existingSupplier) {
      if (existingSupplier.name === name) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '供货商名称已存在');
      }
      if (existingSupplier.phone === phone) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '供货商电话已存在');
      }
      if (existingSupplier.wechat === wechat) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '供货商微信已存在');
      }
    }
    return this.prisma.supplier.create({ data });
  }

  async update(
    id: string,
    data: Prisma.SupplierUpdateInput,
  ): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async list(
    data: SupplierPageParams,
  ): Promise<ListByPage<SupplierListItem[]>> {
    const { page, pageSize, name, phone, wechat } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: Prisma.SupplierWhereInput = {
      delete: 0, // 仅查询未删除的供货商
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (phone) {
      where.phone = {
        contains: phone,
      };
    }

    if (wechat) {
      where.wechat = {
        contains: wechat,
      };
    }

    const [suppliers, totalCount] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
        where,
        include: {
          _count: {
            select: {
              groupBuy: {
                where: {
                  delete: 0,
                },
              },
            },
          },
        },
      }),
      this.prisma.supplier.count({ where }), // 获取总记录数
    ]);

    return {
      data: suppliers.map((supplier) => ({
        ...supplier,
        groupBuyCount: supplier._count.groupBuy,
      })),
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where: { id },
    });
  }

  async delete(id: string): Promise<Supplier> {
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { id, delete: 0 },
    });

    if (!existingSupplier) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '供货商不存在或已被删除。',
      );
    }

    const groupBuyCount = await this.prisma.groupBuy.count({
      where: {
        supplierId: id,
        delete: 0, // 只检查未删除的团购单
      },
    });

    if (groupBuyCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该供货商下存在关联的团购单（${groupBuyCount}条），无法删除。`,
      );
    }

    const deletedSupplier = await this.prisma.supplier.update({
      where: { id },
      data: { delete: 1 },
    });

    // 软删除成功后，清理关联的图片
    if (existingSupplier.images && Array.isArray(existingSupplier.images)) {
      for (const filename of existingSupplier.images as string[]) {
        await this.uploadService.cleanupOrphanedImage(filename);
      }
    }

    return deletedSupplier;
  }

  async listAll(): Promise<Supplier[]> {
    return this.prisma.supplier.findMany({
      where: {
        delete: 0,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
