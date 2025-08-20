// src/upload/upload.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common'; // 导入 Logger, NotFoundException
import { getImagePath } from '../utils/file-upload.utils'; // 导入 getImagePath
import { unlink, readFile, readdir } from 'fs/promises'; // 导入 fs/promises 中的 unlink 用于异步删除文件
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

    // 根据类型更新业务实体
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
    this.logger.log(`已更新业务实体 ${type} #${id} 的图片引用。`);

    // 调用通用清理方法
    return this.cleanupOrphanedImage(filename);
  }

  /**
   * 清理无引用的图片文件。
   * 检查指定的图片文件名是否还在任何业务记录中被引用，如果没有，则执行物理删除。
   * @param filename 要检查和清理的文件名
   */
  async cleanupOrphanedImage(filename: string): Promise<{ message: string }> {
    // 检查图片是否仍在别处被引用
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

    // 如果没有引用，则物理删除
    this.logger.log(`文件 ${filename} 已无引用，准备删除...`);
    const filePath = getImagePath(filename);

    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
        this.logger.log(`成功删除物理文件: ${filePath}`);
      } catch {
        this.logger.error(`删除物理文件 ${filePath} 失败`);
      }
    } else {
      this.logger.warn(`物理文件未找到，跳过删除: ${filePath}`);
    }

    // 删除数据库记录（如果存在则删除，不存在则忽略）
    try {
      await this.prisma.image.delete({ where: { filename } });
      this.logger.log(`成功从数据库中删除图片记录: ${filename}`);
    } catch {
      // 可能不存在记录或唯一约束不匹配，按需求不抛错，仅记录日志
      this.logger.warn(`数据库中未找到图片记录或删除失败(忽略): ${filename}`);
    }

    return { message: '图片已成功删除。' };
  }

  /**
   * 扫描孤立图片：合并磁盘与数据库中的文件名集合，并剔除仍被引用的文件
   * 返回可用于前端预览的列表
   */
  async scanOrphanImages(): Promise<
    { filename: string; inDisk: boolean; inDB: boolean }[]
  > {
    // 读取磁盘文件名
    let diskFiles: string[] = [];
    try {
      const uploadDirPath = getImagePath('');
      // getImagePath('') => join(process.cwd(), UPLOAD_DIR, '')
      const entries = await readdir(uploadDirPath, { withFileTypes: true });
      diskFiles = entries.filter((e) => e.isFile()).map((e) => e.name);
    } catch (e) {
      this.logger.error('读取上传目录失败', e);
    }

    // 读取数据库文件名
    const dbImages = await this.prisma.image.findMany({
      where: { delete: 0 },
      select: { filename: true },
    });
    const dbFiles = dbImages.map((i) => i.filename);

    // 合并集合
    const union = new Set<string>([...diskFiles, ...dbFiles]);

    // 构建引用集合
    const [suppliers, groupBuys] = await Promise.all([
      this.prisma.supplier.findMany({ where: { delete: 0 } }),
      this.prisma.groupBuy.findMany({ where: { delete: 0 } }),
    ]);

    const referenced = new Set<string>();
    suppliers.forEach((s) => {
      (s.images as string[]).forEach((f) => referenced.add(f));
    });
    groupBuys.forEach((g) => {
      (g.images as string[]).forEach((f) => referenced.add(f));
    });

    // 过滤出未被引用的文件
    const orphanList: { filename: string; inDisk: boolean; inDB: boolean }[] =
      [];
    union.forEach((f) => {
      if (!referenced.has(f)) {
        orphanList.push({
          filename: f,
          inDisk: diskFiles.includes(f),
          inDB: dbFiles.includes(f),
        });
      }
    });

    return orphanList;
  }

  /**
   * 批量删除孤立图片
   */
  async deleteOrphanImages(
    filenames: string[],
  ): Promise<{ deleted: string[]; skipped: string[] }> {
    const deleted: string[] = [];
    const skipped: string[] = [];

    // 预取引用数据到内存，减少循环内查询
    const [suppliers, groupBuys] = await Promise.all([
      this.prisma.supplier.findMany({ where: { delete: 0 } }),
      this.prisma.groupBuy.findMany({ where: { delete: 0 } }),
    ]);

    const referenced = new Set<string>();
    suppliers.forEach((s) => {
      (s.images as string[]).forEach((f) => referenced.add(f));
    });
    groupBuys.forEach((g) => {
      (g.images as string[]).forEach((f) => referenced.add(f));
    });

    for (const filename of filenames) {
      if (referenced.has(filename)) {
        skipped.push(filename);
        continue;
      }
      await this.cleanupOrphanedImage(filename);
      deleted.push(filename);
    }

    return { deleted, skipped };
  }
}
