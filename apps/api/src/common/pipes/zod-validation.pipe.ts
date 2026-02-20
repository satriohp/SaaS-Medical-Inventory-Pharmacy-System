import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * ZodValidationPipe — validates request body against a Zod schema.
 * Usage: @UsePipes(new ZodValidationPipe(mySchema))
 * Or per-param: @Body(new ZodValidationPipe(mySchema)) dto: MyDto
 */
export class ZodValidationPipe implements PipeTransform {
    constructor(private readonly schema: ZodSchema) { }

    transform(value: unknown): unknown {
        const result = this.schema.safeParse(value);

        if (!result.success) {
            const errors = this.formatErrors(result.error);
            throw new BadRequestException({
                message: 'Validation failed',
                errors,
            });
        }

        return result.data;
    }

    private formatErrors(error: ZodError): Record<string, string[]> {
        const formatted: Record<string, string[]> = {};

        for (const issue of error.issues) {
            const path = issue.path.join('.') || '_root';
            if (!formatted[path]) {
                formatted[path] = [];
            }
            formatted[path].push(issue.message);
        }

        return formatted;
    }
}
