import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * GlobalExceptionFilter — catches ALL exceptions, formats consistent error responses.
 * Ensures no sensitive data (stack traces, internal details) leaks to clients.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let errors: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const errorResponse = exception.getResponse();

            if (typeof errorResponse === 'string') {
                message = errorResponse;
            } else if (typeof errorResponse === 'object') {
                const errObj = errorResponse as any;
                message = errObj.message || message;
                errors = errObj.errors;

                // Handle NestJS validation pipe errors (array of messages)
                if (Array.isArray(errObj.message)) {
                    message = 'Validation failed';
                    errors = errObj.message;
                }
            }
        } else if (exception instanceof Error) {
            // Log unexpected errors with full stack trace for debugging
            this.logger.error(
                `Unhandled exception: ${exception.message}`,
                exception.stack,
            );
            // Don't expose internal error details to client
            message = 'Internal server error';
        }

        // Always log the request details for tracing
        this.logger.warn(
            `[${request.method}] ${request.url} → ${status} | ${message}`,
        );

        response.status(status).json({
            success: false,
            statusCode: status,
            message,
            errors,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
