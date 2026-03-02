import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementService } from '../../src/modules/stock-movement/stock-movement.service';
import { StockMovementRepository } from '../../src/modules/stock-movement/stock-movement.repository';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ProductRepository } from '../../src/modules/product/product.repository';
import { MovementType } from '@prisma/client';

/**
 * Unit tests for StockMovementService — immutability and compensating entry logic.
 * Blueprint requirement Section 7.3: Critical Test Cases
 */
describe('StockMovementService', () => {
    let service: StockMovementService;
    let stockMovementRepository: jest.Mocked<StockMovementRepository>;
    let inventoryService: jest.Mocked<InventoryService>;
    let productRepository: jest.Mocked<ProductRepository>;

    const TENANT_ID = 'tenant-01';
    const USER_ID = 'user-01';
    const PRODUCT = {
        id: 'prod-01',
        tenantId: TENANT_ID,
        name: 'Paracetamol',
        sku: 'PCM-001',
        isActive: true,
        minStock: 10,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StockMovementService,
                {
                    provide: StockMovementRepository,
                    useValue: {
                        create: jest.fn(),
                        findById: jest.fn(),
                        findAll: jest.fn(),
                    },
                },
                {
                    provide: InventoryService,
                    useValue: {
                        updateStock: jest.fn().mockResolvedValue({ quantity: 50, product: PRODUCT }),
                    },
                },
                {
                    provide: ProductRepository,
                    useValue: {
                        findById: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<StockMovementService>(StockMovementService);
        stockMovementRepository = module.get(StockMovementRepository) as jest.Mocked<StockMovementRepository>;
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
        productRepository = module.get(ProductRepository) as jest.Mocked<ProductRepository>;
    });

    describe('create (immutable ledger)', () => {
        // ✅ Blueprint Test Case: Inventory update after movement
        it('should create movement and trigger inventory update', async () => {
            productRepository.findById.mockResolvedValue(PRODUCT as any);
            stockMovementRepository.create.mockResolvedValue({ id: 'mov-01', type: MovementType.IN } as any);

            await service.create(TENANT_ID, USER_ID, {
                productId: PRODUCT.id,
                type: MovementType.IN,
                quantity: 50,
            });

            expect(stockMovementRepository.create).toHaveBeenCalledTimes(1);
            expect(inventoryService.updateStock).toHaveBeenCalledWith(
                TENANT_ID, PRODUCT.id, 50, undefined, undefined
            );
        });

        // ✅ Blueprint Test Case: OUT movement decreases stock
        it('should apply negative quantityChange for OUT movement', async () => {
            productRepository.findById.mockResolvedValue(PRODUCT as any);
            stockMovementRepository.create.mockResolvedValue({ id: 'mov-02', type: MovementType.OUT } as any);

            await service.create(TENANT_ID, USER_ID, {
                productId: PRODUCT.id,
                type: MovementType.OUT,
                quantity: 10,
            });

            // OUT should use -10
            expect(inventoryService.updateStock).toHaveBeenCalledWith(
                TENANT_ID, PRODUCT.id, -10, undefined, undefined
            );
        });

        // ✅ Blueprint Test Case: StockMovement tidak bisa di-update/delete
        it('should NOT have update or delete methods (immutable ledger)', () => {
            expect((service as any).update).toBeUndefined();
            expect((service as any).delete).toBeUndefined();
            expect((service as any).remove).toBeUndefined();
        });

        it('should throw if product not found in tenant', async () => {
            productRepository.findById.mockResolvedValue(null);
            await expect(
                service.create(TENANT_ID, USER_ID, { productId: 'bad-id', type: MovementType.IN, quantity: 1 })
            ).rejects.toThrow('Product not found');
        });

        it('should throw if product is inactive', async () => {
            productRepository.findById.mockResolvedValue({ ...PRODUCT, isActive: false } as any);
            await expect(
                service.create(TENANT_ID, USER_ID, { productId: PRODUCT.id, type: MovementType.IN, quantity: 1 })
            ).rejects.toThrow('inactive');
        });
    });

    describe('createCompensatingEntry', () => {
        // ✅ Blueprint Test Case: Compensating entry logic
        it('should create a compensating adjustment when reversing a movement', async () => {
            const originalMovement = {
                id: 'mov-01', type: MovementType.IN, quantity: 10,
                productId: PRODUCT.id, batchNumber: null
            };
            stockMovementRepository.findById.mockResolvedValue(originalMovement as any);
            productRepository.findById.mockResolvedValue(PRODUCT as any);
            stockMovementRepository.create.mockResolvedValue({ id: 'mov-02' } as any);

            await service.createCompensatingEntry(TENANT_ID, USER_ID, 'mov-01', 'correction');

            expect(stockMovementRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: MovementType.ADJUSTMENT,
                    quantity: 10,
                    reference: 'COMP-mov-01',
                })
            );
        });
    });
});
