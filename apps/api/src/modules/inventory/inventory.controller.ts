import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Controller('inventory')
@UseGuards(JwtGuard, TenantGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    async getInventorySummary(
        @TenantId() tenantId: string,
        @Query('search') search?: string,
        @Query('lowStockOnly') lowStockOnly?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.inventoryService.getInventorySummary(tenantId, {
            search,
            lowStockOnly: lowStockOnly === 'true',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
        });
    }

    @Get('dashboard')
    async getDashboardStats(@TenantId() tenantId: string) {
        return this.inventoryService.getDashboardStats(tenantId);
    }
}
