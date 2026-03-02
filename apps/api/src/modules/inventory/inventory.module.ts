import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryEventsService } from './inventory.events';

@Module({
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository, InventoryEventsService],
    exports: [InventoryService, InventoryRepository, InventoryEventsService],
})
export class InventoryModule { }
