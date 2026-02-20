import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly auditRepository: AuditRepository) { }

    /**
     * Create an audit log entry. Called from LoggingInterceptor or directly.
     */
    async createLog(data: {
        tenantId: string;
        userId: string;
        action: string;
        entity: string;
        entityId?: string;
        before?: any;
        after?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        try {
            return await this.auditRepository.create(data);
        } catch (error) {
            // Audit logging should never break the main flow
            this.logger.error('Failed to create audit log entry', error);
            return null;
        }
    }

    /**
     * Get audit logs for a tenant with optional filters.
     */
    async getLogs(
        tenantId: string,
        options?: {
            userId?: string;
            action?: string;
            entity?: string;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
        },
    ) {
        return this.auditRepository.findAll(tenantId, {
            userId: options?.userId,
            action: options?.action,
            entity: options?.entity,
            startDate: options?.startDate ? new Date(options.startDate) : undefined,
            endDate: options?.endDate ? new Date(options.endDate) : undefined,
            page: options?.page,
            limit: options?.limit,
        });
    }
}
