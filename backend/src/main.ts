import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalResponseInterceptor } from './interceptors/global-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalInterceptors(new GlobalResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
