import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { StockMovementService, CreateMovementDto } from './stock-movement.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, MovementType } from '@prisma/client';
import { z } from 'zod';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const createMovementSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    type: z.nativeEnum(MovementType),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    batchNumber: z.string().max(100).optional(),
    expiryDate: z.string().datetime().optional(),
    reference: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(),
});

const compensatingSchema = z.object({
    originalMovementId: z.string().min(1, 'Original movement ID is required'),
    notes: z.string().min(1, 'Notes are required for compensating entries').max(1000),
});

// ============================================================================
// CONTROLLER — NO UPDATE OR DELETE ENDPOINTS (IMMUTABLE LEDGER)
// ============================================================================

@Controller('stock-movements')
@UseGuards(JwtGuard, TenantGuard)
export class StockMovementController {
    constructor(private readonly stockMovementService: StockMovementService) { }

    @Get()
    async findAll(
        @TenantId() tenantId: string,
        @Query('productId') productId?: string,
        @Query('type') type?: MovementType,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.stockMovementService.findAll(tenantId, {
            productId,
            type,
            startDate,
            endDate,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
        });
    }

    @Get(':id')
    async findById(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.stockMovementService.findById(tenantId, id);
    }

    @Post()
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN, Role.PHARMACIST)
    async create(
        @TenantId() tenantId: string,
        @CurrentUser('sub') userId: string,
        @Body(new ZodValidationPipe(createMovementSchema)) dto: CreateMovementDto,
    ) {
        return this.stockMovementService.create(tenantId, userId, dto);
    }

    @Post('compensate')
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    async compensate(
        @TenantId() tenantId: string,
        @CurrentUser('sub') userId: string,
        @Body(new ZodValidationPipe(compensatingSchema))
        body: { originalMovementId: string; notes: string },
    ) {
        return this.stockMovementService.createCompensatingEntry(
            tenantId,
            userId,
            body.originalMovementId,
            body.notes,
        );
    }
}
