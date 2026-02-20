import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.config';
import { corsConfig } from './config/security.config';

async function bootstrap() {
    // Validate environment variables — fail fast
    const env = validateEnv();

    const app = await NestFactory.create(AppModule, {
        logger:
            env.NODE_ENV === 'production'
                ? ['error', 'warn', 'log']
                : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const logger = new Logger('Bootstrap');

    // ============================================================================
    // SECURITY MIDDLEWARE
    // ============================================================================

    // Helmet — security headers (XSS, CSP, HSTS, etc.)
    app.use(helmet());

    // CORS — controlled cross-origin access
    app.enableCors(corsConfig(env.CORS_ORIGIN));

    // Global API prefix
    app.setGlobalPrefix('api');

    // ============================================================================
    // GRACEFUL SHUTDOWN
    // ============================================================================
    app.enableShutdownHooks();

    // ============================================================================
    // START SERVER
    // ============================================================================
    await app.listen(env.PORT);

    logger.log(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.log(`📋 API prefix: /api`);
    logger.log(`🔒 CORS origin: ${env.CORS_ORIGIN}`);
    logger.log(`🌍 Environment: ${env.NODE_ENV}`);
}

bootstrap().catch((err) => {
    console.error('❌ Failed to start application:', err);
    process.exit(1);
});
