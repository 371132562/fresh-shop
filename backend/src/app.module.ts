import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from '../prisma/prisma.module';
import { SupplierModule } from './supplier/supplier.module';
import { ProductTypeModule } from './productType/productType.module';
import { UploadModule } from './upload/upload.module';
import { UPLOAD_DIR } from './utils/file-upload.utils'; // 导入上传目录常量

@Module({
  imports: [
    // 配置 @nestjs/serve-static 模块来提供静态文件服务
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), UPLOAD_DIR), // 静态文件在服务器上的物理路径
      serveRoot: `/${UPLOAD_DIR.replace('./', '')}`, // URL 前缀，例如 /uploads/images
      // exclude: ['/api*'], // 可选：排除不需要提供静态服务的路由
    }),
    UploadModule, // 上传模块
    PrismaModule,
    SupplierModule,
    ProductTypeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
