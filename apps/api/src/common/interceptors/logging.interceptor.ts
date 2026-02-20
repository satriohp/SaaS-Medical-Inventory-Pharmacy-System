import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * LoggingInterceptor — creates audit log entries for ALL write operations.
 * Runs AFTER the response is generated (tap operator).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);
    private readonly WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    constructor(private readonly prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url, ip, headers } = request;
        const user = (request as any).user;
        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: async (responseBody) => {
                    const duration = Date.now() - startTime;
                    this.logger.log(
                        `[${method}] ${url} → ${duration}ms | User: ${user?.sub || 'anonymous'}`,
                    );

                    // Only audit write operations for authenticated users with tenant context
                    if (this.WRITE_METHODS.includes(method) && user?.sub && user?.tenantId) {
                        try {
                            await this.prisma.auditLog.create({
                                data: {
                                    tenantId: user.tenantId,
                                    userId: user.sub,
                                    action: `${method} ${url}`,
                                    entity: this.extractEntity(url),
                                    entityId: responseBody?.data?.id || null,
                                    after: responseBody?.data || null,
                                    ipAddress: ip || headers['x-forwarded-for']?.toString() || null,
                                    userAgent: headers['user-agent'] || null,
                                },
                            });
                        } catch (error) {
                            // Never let audit log failure break the main flow
                            this.logger.error('Failed to create audit log', error);
                        }
                    }
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.logger.warn(
                        `[${method}] ${url} → FAILED ${duration}ms | ${error.message}`,
                    );
                },
            }),
        );
    }

    /**
     * Extract the primary entity name from URL path.
     * e.g., /api/products/123 → "products"
     */
    private extractEntity(url: string): string {
        const segments = url.split('/').filter(Boolean);
        // Skip 'api' prefix if present
        const entityIndex = segments[0] === 'api' ? 1 : 0;
        return segments[entityIndex] || 'unknown';
    }
}
