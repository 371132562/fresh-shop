// src/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile, // 导入 UploadedFile
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; // 导入 FileInterceptor
import { multerOptions } from '../utils/file-upload.utils';
import { UploadService } from './upload.service';
import { DeleteImageDto } from 'types/dto';

@Controller('upload') // 基础路由 /upload
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions)) // 'file' 是表单字段名
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    // 基本校验
    if (!file) {
      throw new BadRequestException('没有文件被上传。');
    }

    // 调用服务处理文件信息
    const result = await this.uploadService.processUploadedFile(file);

    return {
      originalName: file.originalname,
      filename: result.filename,
    };
  }

  @Post('delete') // 完整路由 /upload/delete (删除)
  async deleteImage(@Body() deleteImageDto: DeleteImageDto) {
    // 调用服务执行删除逻辑
    return this.uploadService.deleteFile(deleteImageDto);
  }

  @Post('scan-orphans') // /upload/scan-orphans
  async scanOrphans() {
    const list = await this.uploadService.scanOrphanImages();
    return { list };
  }

  @Post('delete-orphans') // /upload/delete-orphans
  async deleteOrphans(@Body() data: { filenames: string[] }) {
    if (!data?.filenames || !Array.isArray(data.filenames)) {
      throw new BadRequestException('参数错误：filenames 必须为数组');
    }
    return this.uploadService.deleteOrphanImages(data.filenames);
  }
}
