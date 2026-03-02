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
    expiryDate?: string;
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

    async create(tenantId: string, userId: string, dto: CreateMovementDto) {
        const product = await this.productRepository.findById(tenantId, dto.productId);
        if (!product) {
            throw new NotFoundException('Product not found in this tenant');
        }

        if (!product.isActive) {
            throw new BadRequestException('Cannot create movement for inactive product');
        }

        if (dto.quantity <= 0) {
            throw new BadRequestException('Quantity must be a positive number');
        }

        const quantityChange = this.calculateQuantityChange(dto.type, dto.quantity);

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

        const updatedInventoryItem = await this.inventoryService.updateStock(
            tenantId,
            dto.productId,
            quantityChange,
            dto.batchNumber,
            dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        );

        this.logger.log(
            `Movement: ${dto.type} ${dto.quantity} x ${product.name} (${product.sku}) | Tenant: ${tenantId}`,
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

        return this.create(tenantId, userId, {
            productId: original.productId,
            type: MovementType.ADJUSTMENT,
            quantity: original.quantity,
            batchNumber: original.batchNumber || undefined,
            reference: `COMP-${originalMovementId}`,
            notes: `Compensating entry for ${originalMovementId}: ${notes}`,
        });
    }

    private calculateQuantityChange(type: MovementType, quantity: number): number {
        switch (type) {
            case MovementType.IN:
            case MovementType.RETURN:
                return quantity;
            case MovementType.OUT:
            case MovementType.EXPIRED:
                return -quantity;
            case MovementType.ADJUSTMENT:
                return quantity;
            default:
                throw new BadRequestException(`Unknown movement type: ${type}`);
        }
    }
}
