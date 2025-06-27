// src/upload/upload.service.ts
import { Injectable } from '@nestjs/common';
import { UPLOAD_DIR } from '../utils/file-upload.utils';

@Injectable()
export class UploadService {
  /**
   * 处理文件上传后的业务逻辑，例如保存文件信息到数据库
   * @param file 上传的文件对象
   * @returns 处理结果，包含文件信息和访问 URL
   */
  async processUploadedFile(file: Express.Multer.File) {
    const fileInfo = {
      originalName: file.originalname,
      url: file.filename, // 可通过服务访问的 URL
      mimetype: file.mimetype,
      size: file.size,
      // 可以在这里添加其他元数据，如上传时间、上传用户ID等
    };

    // 在实际项目中，你通常会将这些文件信息保存到数据库中
    console.log(`已上传的文件信息:`, fileInfo);

    return fileInfo;
  }
}
