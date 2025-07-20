import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { readdir, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

type AffectedSupplier = {
  id: string;
  name: string;
};

type AffectedGroupBuy = {
  id: string;
  name: string;
  groupBuyStartDate: Date;
};

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deduplicateImages() {
    this.logger.log('开始处理历史重复图片...');

    const uploadDir = process.env.UPLOAD_DIR;
    if (!uploadDir) {
      throw new Error('UPLOAD_DIR 环境变量未设置。');
    }
    const fullUploadDirPath = join(process.cwd(), uploadDir);
    const allFilenames = await readdir(fullUploadDirPath);

    this.logger.log(
      `在 ${fullUploadDirPath} 中找到 ${allFilenames.length} 个文件。`,
    );

    const hashToFiles = new Map<string, string[]>();
    // 1. 计算所有文件的哈希值并分组
    for (const filename of allFilenames) {
      try {
        const filePath = join(fullUploadDirPath, filename);
        const fileBuffer = await readFile(filePath);
        const hash = createHash('sha256').update(fileBuffer).digest('hex');

        const files = hashToFiles.get(hash) || [];
        files.push(filename);
        hashToFiles.set(hash, files);
      } catch (error) {
        this.logger.error(`处理文件 ${filename} 时出错:`, error);
      }
    }

    this.logger.log(`分析完成，找到 ${hashToFiles.size} 个唯一的图片。`);

    const oldToCanonicalFileMap = new Map<string, string>();
    const filesToDelete = new Set<string>();

    // 2. 为每个唯一的哈希确定一个“规范”文件，并填充 Image 表
    for (const [hash, filenames] of hashToFiles.entries()) {
      const [canonicalFile, ...duplicates] = filenames.sort(); // 排序以确保每次都选择同一个

      duplicates.forEach((f) => filesToDelete.add(f));
      filenames.forEach((f) => oldToCanonicalFileMap.set(f, canonicalFile));

      const existingImage = await this.prisma.image.findFirst({
        where: { hash, delete: 0 },
      });
      if (!existingImage) {
        await this.prisma.image.create({
          data: {
            filename: canonicalFile,
            originalName: canonicalFile, // 历史数据无法得知原始文件名，使用文件名代替
            hash,
          },
        });
      }
    }

    this.logger.log('Image 表填充完毕，开始更新业务数据中的图片引用...');

    // 3. 更新所有业务表中的图片引用
    const affectedSuppliers = await this.updateSupplierImages(
      oldToCanonicalFileMap,
    );
    const affectedGroupBuys = await this.updateGroupBuyImages(
      oldToCanonicalFileMap,
    );

    this.logger.log('所有业务数据更新完毕！');

    // 4. 删除重复文件
    this.logger.log(`准备删除 ${filesToDelete.size} 个重复文件...`);
    for (const filename of filesToDelete) {
      try {
        const filePath = join(fullUploadDirPath, filename);
        await unlink(filePath);
        this.logger.log(`已删除文件: ${filename}`);
      } catch (error) {
        this.logger.error(`删除文件 ${filename} 失败:`, error);
      }
    }

    return {
      message: '历史图片去重完成。重复文件已被删除，数据库引用已更新。',
      uniqueImageCount: hashToFiles.size,
      totalFilesScanned: allFilenames.length,
      duplicateFilesFound: filesToDelete.size,
      affectedSuppliers,
      affectedGroupBuys,
    };
  }

  private async updateSupplierImages(
    mapping: Map<string, string>,
  ): Promise<AffectedSupplier[]> {
    const affectedSuppliers: AffectedSupplier[] = [];
    const records = await this.prisma.supplier.findMany({
      where: { delete: 0 },
    });
    for (const record of records) {
      const oldImages = record.images;
      if (!Array.isArray(oldImages) || oldImages.length === 0) continue;

      const newImages = new Set<string>();
      for (const oldFile of oldImages) {
        if (typeof oldFile === 'string' && mapping.has(oldFile)) {
          newImages.add(mapping.get(oldFile)!);
        }
      }

      const newImagesArray = Array.from(newImages);
      if (JSON.stringify(oldImages) !== JSON.stringify(newImagesArray)) {
        await this.prisma.supplier.update({
          where: { id: record.id },
          data: { images: newImagesArray },
        });
        this.logger.log(`更新了 supplier #${record.id} 的图片引用。`);
        affectedSuppliers.push({ id: record.id, name: record.name });
      }
    }
    return affectedSuppliers;
  }

  private async updateGroupBuyImages(
    mapping: Map<string, string>,
  ): Promise<AffectedGroupBuy[]> {
    const affectedGroupBuys: AffectedGroupBuy[] = [];
    const records = await this.prisma.groupBuy.findMany({
      where: { delete: 0 },
    });
    for (const record of records) {
      const oldImages = record.images;
      if (!Array.isArray(oldImages) || oldImages.length === 0) continue;

      const newImages = new Set<string>();
      for (const oldFile of oldImages) {
        if (typeof oldFile === 'string' && mapping.has(oldFile)) {
          newImages.add(mapping.get(oldFile)!);
        }
      }

      const newImagesArray = Array.from(newImages);
      if (JSON.stringify(oldImages) !== JSON.stringify(newImagesArray)) {
        await this.prisma.groupBuy.update({
          where: { id: record.id },
          data: { images: newImagesArray },
        });
        this.logger.log(`更新了 groupBuy #${record.id} 的图片引用。`);
        affectedGroupBuys.push({
          id: record.id,
          name: record.name,
          groupBuyStartDate: record.groupBuyStartDate,
        });
      }
    }
    return affectedGroupBuys;
  }
}
