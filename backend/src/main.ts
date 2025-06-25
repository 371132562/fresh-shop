import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './exceptions/allExceptionsFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // 注册全局拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 注册全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 添加全局路径前缀
  app.setGlobalPrefix('fresh');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
