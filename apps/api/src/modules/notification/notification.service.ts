import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    async sendToTenant(tenantId: string, notification: {
        type: string;
        title: string;
        message: string;
        data?: any;
    }) {
        this.logger.log(
            `Notification [${notification.type}]: ${notification.title} → tenant ${tenantId}`,
        );
        return notification;
    }
}
