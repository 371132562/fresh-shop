// src/supplier/supplier.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common'; // 导入 InternalServerErrorException
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { Supplier } from '@prisma/client';

import { PageParams, ListByPage } from 'fresh-shop-common/types/dto';

@Injectable()
export class SupplierService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
  ) {}

  async create(data: Supplier): Promise<Supplier> {
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, data: Supplier): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async list(data: PageParams): Promise<ListByPage<Supplier[]>> {
    const { page, pageSize } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const [suppliers, totalCount] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
      }),
      this.prisma.supplier.count(), // 获取总记录数
    ]);

    return {
      data: suppliers,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string) {
    return this.prisma.supplier.findUnique({
      where: {
        id,
      },
    });
  }

  async deleteImage(id: string, filename: string): Promise<void> {
    // 使用 Prisma 事务确保原子性操作
    await this.prisma
      .$transaction(async (tx) => {
        // 1. 调用 UploadService 删除文件
        const res = await this.upload.deleteFile(filename);

        // 如果文件删除成功 (UploadService 会在失败时抛出异常，所以这里只需检查成功标志)
        if (res.delete) {
          // 2. 获取供应商详情
          const detail = await tx.supplier.findUnique({ where: { id } });

          // 检查供应商是否存在
          if (!detail) {
            throw new InternalServerErrorException(`供应商 ${id} 不存在。`);
          }

          // 确保 images 字段是字符串且是有效的 JSON
          const currentImages = JSON.parse(detail.images);

          // 3. 从图片列表中移除指定文件名
          const updatedImages = currentImages.filter(
            (item: string) => item !== filename,
          );

          // 4. 更新供应商的图片列表
          await tx.supplier.update({
            where: { id },
            data: {
              images: JSON.stringify(updatedImages),
            },
          });
        } else {
          // 理论上 UploadService 会抛出异常，但这里作为一个额外的保障
          throw new InternalServerErrorException(
            '文件删除失败，但未抛出具体异常。',
          );
        }
      })
      .catch((error) => {
        // 捕获事务中的任何错误，并重新抛出，以便上层控制器可以处理
        console.error('删除图片事务失败:', error);
        throw error; // 将错误重新抛出
      });
  }
}
