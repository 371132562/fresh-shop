import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BusinessException } from './businessException';

@Catch() // 捕获所有异常
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    // const request = ctx.getRequest();

    let code: number = HttpStatus.INTERNAL_SERVER_ERROR; // 默认服务器错误码
    let msg: string = '服务内部错误'; // 默认错误信息
    const data: any = null; // 错误数据，通常为null

    if (exception instanceof BusinessException) {
      // 如果是自定义业务异常
      code = (exception.getResponse() as any).code || 50000; // 提取自定义code
      msg = (exception.getResponse() as any).message || '业务逻辑错误'; // 提取自定义message
    } else if (exception instanceof HttpException) {
      // 如果是 NestJS 内置的 HttpException (例如 ValidationPipe 抛出的错误)
      const status = exception.getStatus();
      code = status; // 此时可以将 HTTP 状态码作为业务错误码
      msg = (exception.getResponse() as any).message || exception.message;
    } else {
      // 其他未知错误
      code = HttpStatus.INTERNAL_SERVER_ERROR;
      msg = (exception as Error).message || '未知错误';
    }

    // 统一返回 200 状态码
    response.status(HttpStatus.OK).json({
      code,
      msg,
      data,
    });
  }
}
