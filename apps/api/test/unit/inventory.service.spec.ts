import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService, INVENTORY_EVENTS } from '../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../src/modules/inventory/inventory.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Unit tests for InventoryService — stock rules and threshold logic.
 * Blueprint requirement Section 7.3: Critical Test Cases
 */
describe('InventoryService', () => {
    let service: InventoryService;
    let inventoryRepository: jest.Mocked<InventoryRepository>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        const mockRepository = {
            findOrCreateDefault: jest.fn(),
            upsertInventoryItem: jest.fn(),
            getDashboardStats: jest.fn(),
            getInventorySummary: jest.fn(),
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: InventoryRepository, useValue: mockRepository },
                { provide: EventEmitter2, useValue: mockEventEmitter },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        inventoryRepository = module.get(InventoryRepository) as jest.Mocked<InventoryRepository>;
        eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
    });

    describe('updateStock', () => {
        const TENANT_ID = 'tenant-01';
        const PRODUCT_ID = 'prod-01';
        const MOCK_INVENTORY = { id: 'inv-01', tenantId: TENANT_ID };

        beforeEach(() => {
            inventoryRepository.findOrCreateDefault.mockResolvedValue(MOCK_INVENTORY as any);
        });

        // ✅ Blueprint Test Case: Inventory quantity update after movement
        it('should update inventory quantity after stock movement', async () => {
            inventoryRepository.upsertInventoryItem.mockResolvedValue({
                id: 'item-01',
                quantity: 50,
                product: { name: 'Paracetamol', sku: 'PCM-001', minStock: 10 },
            } as any);

            const result = await service.updateStock(TENANT_ID, PRODUCT_ID, 10);
            expect(result.quantity).toBe(50);
            expect(inventoryRepository.upsertInventoryItem).toHaveBeenCalledWith(
                MOCK_INVENTORY.id, PRODUCT_ID, 10, undefined, undefined
            );
        });

        // ✅ Blueprint Test Case: Alert ter-emit saat quantity < minStock
        it('should emit LOW_STOCK event when quantity falls below minStock', async () => {
            inventoryRepository.upsertInventoryItem.mockResolvedValue({
                id: 'item-01',
                quantity: 5, // Below minStock of 10
                product: { name: 'Paracetamol', sku: 'PCM-001', minStock: 10 },
            } as any);

            await service.updateStock(TENANT_ID, PRODUCT_ID, -5);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                INVENTORY_EVENTS.LOW_STOCK,
                expect.objectContaining({
                    tenantId: TENANT_ID,
                    productId: PRODUCT_ID,
                    currentQuantity: 5,
                    minStock: 10,
                })
            );
        });

        // ✅ Blueprint Test Case: Out-of-stock event
        it('should emit OUT_OF_STOCK event when quantity reaches 0', async () => {
            inventoryRepository.upsertInventoryItem.mockResolvedValue({
                id: 'item-01',
                quantity: 0,
                product: { name: 'Paracetamol', sku: 'PCM-001', minStock: 10 },
            } as any);

            await service.updateStock(TENANT_ID, PRODUCT_ID, -10);

            expect(eventEmitter.emit).toHaveBeenCalledWith(
                INVENTORY_EVENTS.OUT_OF_STOCK,
                expect.objectContaining({ currentQuantity: 0 })
            );
        });

        // ✅ Blueprint Test Case: Normal stock — no threshold event
        it('should NOT emit LOW_STOCK when stock is above minStock', async () => {
            inventoryRepository.upsertInventoryItem.mockResolvedValue({
                id: 'item-01',
                quantity: 50, // Above minStock of 10
                product: { name: 'Paracetamol', sku: 'PCM-001', minStock: 10 },
            } as any);

            await service.updateStock(TENANT_ID, PRODUCT_ID, 50);

            const lowStockCalls = eventEmitter.emit.mock.calls.filter(
                ([event]) => event === INVENTORY_EVENTS.LOW_STOCK
            );
            expect(lowStockCalls).toHaveLength(0);
        });
    });
});
