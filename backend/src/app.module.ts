import { Module } from '@nestjs/common';
import { join } from 'path';

//公共模块
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from './upload/upload.module';
import { UPLOAD_DIR } from './utils/file-upload.utils'; // 导入上传目录常量

//业务模块
import { SupplierModule } from './supplier/supplier.module';
import { ProductTypeModule } from './productType/productType.module';
import { ProductModule } from './product/product.module';
import { CustomerAddressModule } from './customerAddress/customerAddress.module';

@Module({
  imports: [
    //公共模块
    // 配置 @nestjs/serve-static 模块来提供静态文件服务
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'frontend', 'dist'), // 指向 monorepo 根目录下的 frontend/dist
      // serveRoot: '/', // 可以省略，默认就是 '/'
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), UPLOAD_DIR), // 静态文件在服务器上的物理路径
      serveRoot: `/${UPLOAD_DIR.replace('./', '')}`, // URL 前缀，例如 /uploads/images
      // exclude: ['/api*'], // 可选：排除不需要提供静态服务的路由
    }),
    PrismaModule,
    UploadModule, // 上传模块

    //业务模块
    SupplierModule,
    ProductTypeModule,
    ProductModule,
    CustomerAddressModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
