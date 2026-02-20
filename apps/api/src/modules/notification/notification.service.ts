import { Injectable, Logger } from '@nestjs/common';

/**
 * NotificationService — handles notification persistence and delivery.
 * Phase 2: Will support email, SMS, and in-app notifications.
 * Currently handles event-based WebSocket notifications via the gateway.
 */
@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    /**
     * Send a notification to a specific tenant.
     * Currently a placeholder — notifications are handled by the gateway.
     */
    async sendToTenant(tenantId: string, notification: {
        type: string;
        title: string;
        message: string;
        data?: any;
    }) {
        this.logger.log(
            `Notification [${notification.type}]: ${notification.title} → tenant ${tenantId}`,
        );
        // Phase 2: Persist to database, send email/SMS
        return notification;
    }
}
