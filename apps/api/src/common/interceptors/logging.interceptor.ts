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

    private extractEntity(url: string): string {
        const segments = url.split('/').filter(Boolean);
        const entityIndex = segments[0] === 'api' ? 1 : 0;
        return segments[entityIndex] || 'unknown';
    }
}
