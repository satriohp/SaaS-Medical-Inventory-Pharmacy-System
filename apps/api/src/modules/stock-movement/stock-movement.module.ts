import { Module } from '@nestjs/common';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';
import { StockMovementRepository } from './stock-movement.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductModule } from '../product/product.module';

@Module({
    imports: [InventoryModule, ProductModule],
    controllers: [StockMovementController],
    providers: [StockMovementService, StockMovementRepository],
    exports: [StockMovementService],
})
export class StockMovementModule { }
