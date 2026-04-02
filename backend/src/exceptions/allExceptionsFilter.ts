import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from './businessException';
import { ErrorCode } from '../../types/response';

type HttpExceptionResponseBody =
  | string
  | {
      message?: string | string[];
    };

const getExceptionMessage = (exception: unknown, fallback: string): string => {
  if (exception instanceof Error && exception.message) {
    return exception.message;
  }
  return fallback;
};

@Catch() // 捕获所有异常
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let code: number;
    let msg: string;
    let data: string | string[] | null = null; // 错误数据，通常为null

    if (exception instanceof BusinessException) {
      // 2xxxx 范围：自定义业务异常
      const exceptionResponse = exception.getResponse() as {
        code: ErrorCode;
        message: string;
      };
      code = exceptionResponse.code || ErrorCode.BUSINESS_FAILED;
      msg = exceptionResponse.message || '业务处理失败';
      data = getExceptionMessage(exception, '业务处理失败');
    } else if (exception instanceof HttpException) {
      // 4xxxx 范围：NestJS 内置的 HttpException (例如 ValidationPipe, NotFoundException 等)
      const status = exception.getStatus() as HttpStatus;
      const exceptionResponse =
        exception.getResponse() as HttpExceptionResponseBody;

      // 这里我们将 HTTP 状态码直接作为 code，因为它们本身就是一种错误码分类
      code = status;
      msg =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : typeof exceptionResponse.message === 'string'
            ? exceptionResponse.message
            : exception.message || 'HTTP请求错误';

      // 对于 ValidationPipe 抛出的错误，其 message 可能是一个数组
      if (
        typeof exceptionResponse !== 'string' &&
        Array.isArray(exceptionResponse.message)
      ) {
        data = exceptionResponse.message; // 将详细验证错误放入 data
      } else {
        data = null;
      }

      // 可以根据 HTTP 状态码进一步细化 msg
      if (status === HttpStatus.BAD_REQUEST) {
        msg = '请求参数错误';
      } else if (status === HttpStatus.UNAUTHORIZED) {
        code = ErrorCode.UNAUTHORIZED; // 将 HTTP 401 映射到 3xxxx 认证错误
        msg = '未认证或认证失败';
      } else if (status === HttpStatus.FORBIDDEN) {
        code = ErrorCode.FORBIDDEN; // 将 HTTP 403 映射到 3xxxx 权限错误
        msg = '无权限访问';
      } else if (status === HttpStatus.NOT_FOUND) {
        msg = '请求资源不存在';
      } else if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        code = ErrorCode.SYSTEM_ERROR; // 将 HTTP 500 映射到 5xxxx 系统错误
        msg = '服务器内部错误';
        // 可以根据需要添加更多 HTTP 状态码的映射和描述
      }
    } else {
      // 5xxxx 范围：其他未知错误
      code = ErrorCode.UNKNOWN_ERROR; // 使用定义的未知错误码
      msg = '未知系统错误发生';
      data = getExceptionMessage(exception, '服务器内部发生未知错误'); // 捕获原始错误消息
    }

    // 统一返回 200 状态码，真正的业务错误码在 'code' 字段中
    response.status(HttpStatus.OK).json({
      code,
      msg,
      data,
    });
  }
}
