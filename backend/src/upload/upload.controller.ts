// src/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile, // 导入 UploadedFile
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; // 导入 FileInterceptor
import { multerOptions } from '../utils/file-upload.utils';
import { UploadService } from './upload.service';

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
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf-8'),
      filename: file.filename,
      path: file.path, // 文件在服务器上的物理路径
      url: result.url, // 获取可访问的 URL
    };
  }
}
