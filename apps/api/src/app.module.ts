import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { throttlerConfig } from './config/security.config';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ProductModule } from './modules/product/product.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StockMovementModule } from './modules/stock-movement/stock-movement.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';

// Common
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
    imports: [
        // Infrastructure
        PrismaModule,
        ThrottlerModule.forRoot(throttlerConfig),
        EventEmitterModule.forRoot(),

        // Feature Modules
        AuthModule,
        TenantModule,
        ProductModule,
        InventoryModule,
        StockMovementModule,
        AuditModule,
        NotificationModule,
    ],
    providers: [
        // Global rate limiting guard
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        // Global exception filter — consistent error responses
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
        // Global transform interceptor — standard response shape
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
        // Global logging interceptor — audit trail
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
    ],
})
export class AppModule { }
