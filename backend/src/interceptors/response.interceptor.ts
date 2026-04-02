import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCode, ResponseBody } from '../../types/response';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseBody<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseBody<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => {
        response.statusCode = 200; // 强制设置为 200
        return { code: ErrorCode.SUCCESS, msg: '成功', data };
      }),
    );
  }
}
