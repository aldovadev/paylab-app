import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

interface ResponseShape {
  status: boolean;
  timestamp: string;
  details: {
    endpoint: string;
    method: string;
    reply: unknown;
  };
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseShape> {
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      map((data) => ({
        status: true,
        timestamp: new Date().toISOString(),
        details: {
          endpoint: request.url,
          method: request.method,
          reply: data,
        },
      })),
    );
  }
}
