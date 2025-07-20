// src/upload/upload.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common'; // 导入 Logger, NotFoundException
import { BusinessException } from '../exceptions/businessException';
import { ErrorCode } from '../../types/response';
import { getImagePath } from '../utils/file-upload.utils'; // 导入 getImagePath
import { unlink, readFile } from 'fs/promises'; // 导入 fs/promises 中的 unlink 用于异步删除文件
import { existsSync } from 'fs'; // 导入 existsSync
import { createHash } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import { DeleteImageDto } from 'types/dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async getFileHash(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 处理文件上传后的业务逻辑，例如保存文件信息到数据库
   * @param file 上传的文件对象
   * @returns 处理结果，包含文件信息和访问 URL
   */
  async processUploadedFile(file: Express.Multer.File) {
    const hash = await this.getFileHash(file.path);
    const originalName = file.originalname;

    const existingImage = await this.prisma.image.findFirst({
      where: {
        hash,
        delete: 0,
      },
    });

    if (existingImage) {
      // 如果文件已存在，删除刚刚上传的重复文件
      await unlink(file.path);
      this.logger.log(
        `重复文件: ${originalName}, 使用已存在的文件: ${existingImage.filename}`,
      );
      return {
        originalName,
        filename: existingImage.filename, // 返回已存在文件的访问 "url" (即文件名)
      };
    }

    // 如果是新文件，保存到数据库
    await this.prisma.image.create({
      data: {
        filename: file.filename,
        originalName,
        hash,
      },
    });

    this.logger.log(`新文件已保存: ${file.filename}`);

    return {
      originalName,
      filename: file.filename,
    };
  }

  async deleteFile(
    deleteImageDto: DeleteImageDto,
  ): Promise<{ message: string }> {
    const { type, id, filename } = deleteImageDto;

    // 1. 根据类型更新业务实体
    if (type === 'supplier') {
      const record = await this.prisma.supplier.findUnique({ where: { id } });
      if (!record)
        throw new NotFoundException(`Supplier with id ${id} not found.`);
      const updatedImages = (record.images as string[]).filter(
        (img) => img !== filename,
      );
      await this.prisma.supplier.update({
        where: { id },
        data: { images: updatedImages },
      });
    } else if (type === 'groupBuy') {
      const record = await this.prisma.groupBuy.findUnique({ where: { id } });
      if (!record)
        throw new NotFoundException(`GroupBuy with id ${id} not found.`);
      const updatedImages = (record.images as string[]).filter(
        (img) => img !== filename,
      );
      await this.prisma.groupBuy.update({
        where: { id },
        data: { images: updatedImages },
      });
    }
    this.logger.log(`已更新业务实体 ${type} ${id} 的图片引用。`);

    // 2. 检查图片是否仍在别处被引用
    const suppliers = await this.prisma.supplier.findMany({
      where: { delete: 0 },
    });
    const groupBuys = await this.prisma.groupBuy.findMany({
      where: { delete: 0 },
    });

    const isReferenced =
      suppliers.some((s) => (s.images as string[]).includes(filename)) ||
      groupBuys.some((g) => (g.images as string[]).includes(filename));

    if (isReferenced) {
      this.logger.log(`文件 ${filename} 仍在其他地方被引用，跳过删除。`);
      return { message: '图片引用已移除，但文件仍在其他地方使用中。' };
    }

    // 3. 如果没有引用，则物理删除
    this.logger.log(`文件 ${filename} 已无引用，准备删除...`);
    const filePath = getImagePath(filename);

    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
        this.logger.log(`成功删除物理文件: ${filePath}`);
      } catch (error) {
        this.logger.error(`删除物理文件 ${filePath} 失败:`, error);
      }
    } else {
      this.logger.warn(`物理文件未找到，跳过删除: ${filePath}`);
    }

    // 删除数据库记录
    try {
      await this.prisma.image.delete({ where: { filename } });
      this.logger.log(`成功从数据库中删除图片记录: ${filename}`);
    } catch (error) {
      this.logger.error(`从数据库中删除图片记录 ${filename} 失败:`, error);
      throw new BusinessException(
        ErrorCode.BUSINESS_FAILED,
        `删除图片数据库记录 ${filename} 失败。`,
      );
    }

    return { message: '图片已成功删除。' };
  }
}
