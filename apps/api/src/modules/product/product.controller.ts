import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ProductService, CreateProductDto, UpdateProductDto } from './product.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import { z } from 'zod';

const createProductSchema = z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
    sku: z
        .string()
        .min(1, 'SKU is required')
        .max(50)
        .transform((v) => v.toUpperCase()),
    category: z.string().max(100).optional(),
    unit: z.string().max(20).default('pcs'),
    description: z.string().max(1000).optional(),
    minStock: z.number().int().min(0).default(10),
});

const updateProductSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    sku: z.string().min(1).max(50).transform((v) => v.toUpperCase()).optional(),
    category: z.string().max(100).optional(),
    unit: z.string().max(20).optional(),
    description: z.string().max(1000).optional(),
    minStock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

@Controller('products')
@UseGuards(JwtGuard, TenantGuard)
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Get()
    async findAll(
        @TenantId() tenantId: string,
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('isActive') isActive?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.productService.findAll(tenantId, {
            search,
            category,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
        });
    }

    @Get(':id')
    async findById(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.productService.findById(tenantId, id);
    }

    @Post()
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN, Role.PHARMACIST)
    async create(
        @TenantId() tenantId: string,
        @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
    ) {
        return this.productService.create(tenantId, dto);
    }

    @Patch(':id')
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN, Role.PHARMACIST)
    async update(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductDto,
    ) {
        return this.productService.update(tenantId, id, dto);
    }

    @Delete(':id')
    @UseGuards(RoleGuard)
    @Roles(Role.OWNER, Role.ADMIN)
    async delete(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.productService.delete(tenantId, id);
    }
}
