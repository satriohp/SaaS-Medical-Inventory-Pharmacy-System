import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { StockMovementRepository } from './stock-movement.repository';
import { InventoryService } from '../inventory/inventory.service';
import { ProductRepository } from '../product/product.repository';
import { MovementType } from '@prisma/client';

export interface CreateMovementDto {
    productId: string;
    type: MovementType;
    quantity: number;
    batchNumber?: string;
    expiryDate?: string; // ISO string from client
    reference?: string;
    notes?: string;
}

@Injectable()
export class StockMovementService {
    private readonly logger = new Logger(StockMovementService.name);

    constructor(
        private readonly stockMovementRepository: StockMovementRepository,
        private readonly inventoryService: InventoryService,
        private readonly productRepository: ProductRepository,
    ) { }

    async findAll(
        tenantId: string,
        options?: {
            productId?: string;
            type?: MovementType;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
        },
    ) {
        return this.stockMovementRepository.findAll(tenantId, {
            productId: options?.productId,
            type: options?.type,
            startDate: options?.startDate ? new Date(options.startDate) : undefined,
            endDate: options?.endDate ? new Date(options.endDate) : undefined,
            page: options?.page,
            limit: options?.limit,
        });
    }

    async findById(tenantId: string, id: string) {
        const movement = await this.stockMovementRepository.findById(tenantId, id);
        if (!movement) {
            throw new NotFoundException('Stock movement not found');
        }
        return movement;
    }

    /**
     * Create a stock movement entry and update inventory.
     *
     * Flow:
     * 1. Validate product exists in tenant
     * 2. Create immutable StockMovement record
     * 3. Update InventoryItem quantity (+ or -)
     * 4. Threshold check → event emission (handled by InventoryService)
     */
    async create(tenantId: string, userId: string, dto: CreateMovementDto) {
        // 1. Validate product exists within tenant
        const product = await this.productRepository.findById(tenantId, dto.productId);
        if (!product) {
            throw new NotFoundException('Product not found in this tenant');
        }

        if (!product.isActive) {
            throw new BadRequestException('Cannot create movement for inactive product');
        }

        // 2. Validate quantity
        if (dto.quantity <= 0) {
            throw new BadRequestException('Quantity must be a positive number');
        }

        // 3. Calculate quantity change based on movement type
        const quantityChange = this.calculateQuantityChange(dto.type, dto.quantity);

        // 4. Create immutable stock movement record
        const movement = await this.stockMovementRepository.create({
            tenantId,
            productId: dto.productId,
            type: dto.type,
            quantity: dto.quantity,
            batchNumber: dto.batchNumber,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
            reference: dto.reference,
            notes: dto.notes,
            performedBy: userId,
        });

        // 5. Update inventory (triggers threshold events internally)
        const updatedInventoryItem = await this.inventoryService.updateStock(
            tenantId,
            dto.productId,
            quantityChange,
            dto.batchNumber,
            dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        );

        this.logger.log(
            `Stock movement: ${dto.type} ${dto.quantity} x ${product.name} (${product.sku}) | Tenant: ${tenantId} | User: ${userId}`,
        );

        return {
            movement,
            inventory: {
                currentQuantity: updatedInventoryItem.quantity,
                isLowStock: updatedInventoryItem.product
                    ? updatedInventoryItem.quantity < updatedInventoryItem.product.minStock
                    : false,
            },
        };
    }

    /**
     * Create a compensating entry (correction).
     * Since movements are IMMUTABLE, corrections are new entries with type ADJUSTMENT.
     */
    async createCompensatingEntry(
        tenantId: string,
        userId: string,
        originalMovementId: string,
        notes: string,
    ) {
        const original = await this.stockMovementRepository.findById(tenantId, originalMovementId);
        if (!original) {
            throw new NotFoundException('Original movement not found');
        }

        // Create reverse movement
        const reverseType = original.type === MovementType.IN ? MovementType.OUT : MovementType.IN;

        return this.create(tenantId, userId, {
            productId: original.productId,
            type: MovementType.ADJUSTMENT,
            quantity: original.quantity,
            batchNumber: original.batchNumber || undefined,
            reference: `COMP-${originalMovementId}`,
            notes: `Compensating entry for ${originalMovementId}: ${notes}`,
        });
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private calculateQuantityChange(type: MovementType, quantity: number): number {
        switch (type) {
            case MovementType.IN:
            case MovementType.RETURN:
                return quantity; // Increase stock
            case MovementType.OUT:
            case MovementType.EXPIRED:
                return -quantity; // Decrease stock
            case MovementType.ADJUSTMENT:
                return quantity; // Can be + or -, but quantity is always positive in record
            default:
                throw new BadRequestException(`Unknown movement type: ${type}`);
        }
    }
}
