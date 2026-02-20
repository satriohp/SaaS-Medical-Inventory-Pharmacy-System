import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Standard API response shape for all endpoints.
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
    timestamp: string;
}

/**
 * TransformInterceptor — wraps all successful responses in a standard shape.
 * Response: { success: true, data: <payload>, message: 'OK', timestamp: '...' }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        _context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => ({
                success: true,
                data: data ?? null,
                message: 'OK',
                timestamp: new Date().toISOString(),
            })),
        );
    }
}
