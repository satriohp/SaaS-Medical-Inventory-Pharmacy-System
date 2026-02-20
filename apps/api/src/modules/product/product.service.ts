import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';

export interface CreateProductDto {
    name: string;
    sku: string;
    category?: string;
    unit?: string;
    description?: string;
    minStock?: number;
}

export interface UpdateProductDto {
    name?: string;
    sku?: string;
    category?: string;
    unit?: string;
    description?: string;
    minStock?: number;
    isActive?: boolean;
}

@Injectable()
export class ProductService {
    private readonly logger = new Logger(ProductService.name);

    constructor(private readonly productRepository: ProductRepository) { }

    async findAll(
        tenantId: string,
        options?: {
            search?: string;
            category?: string;
            isActive?: boolean;
            page?: number;
            limit?: number;
        },
    ) {
        return this.productRepository.findAll(tenantId, options);
    }

    async findById(tenantId: string, id: string) {
        const product = await this.productRepository.findById(tenantId, id);
        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Calculate total stock across all inventory items
        const totalStock = product.inventoryItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
        );

        return {
            ...product,
            totalStock,
            isLowStock: totalStock < product.minStock,
        };
    }

    async create(tenantId: string, dto: CreateProductDto) {
        // Check SKU uniqueness within tenant
        const existing = await this.productRepository.findBySku(tenantId, dto.sku);
        if (existing) {
            throw new ConflictException(`SKU "${dto.sku}" already exists in this tenant`);
        }

        const product = await this.productRepository.create({
            name: dto.name,
            sku: dto.sku,
            category: dto.category,
            unit: dto.unit || 'pcs',
            description: dto.description,
            minStock: dto.minStock ?? 10,
            tenant: { connect: { id: tenantId } },
        });

        this.logger.log(`Product created: ${product.id} | SKU: ${dto.sku} | Tenant: ${tenantId}`);
        return product;
    }

    async update(tenantId: string, id: string, dto: UpdateProductDto) {
        // Verify product exists
        const existing = await this.productRepository.findById(tenantId, id);
        if (!existing) {
            throw new NotFoundException('Product not found');
        }

        // Check SKU uniqueness if changing
        if (dto.sku && dto.sku !== existing.sku) {
            const skuConflict = await this.productRepository.findBySku(tenantId, dto.sku);
            if (skuConflict) {
                throw new ConflictException(`SKU "${dto.sku}" already exists in this tenant`);
            }
        }

        await this.productRepository.update(tenantId, id, dto);
        this.logger.log(`Product updated: ${id} | Tenant: ${tenantId}`);

        return this.productRepository.findById(tenantId, id);
    }

    async delete(tenantId: string, id: string) {
        const existing = await this.productRepository.findById(tenantId, id);
        if (!existing) {
            throw new NotFoundException('Product not found');
        }

        await this.productRepository.softDelete(tenantId, id);
        this.logger.log(`Product soft-deleted: ${id} | Tenant: ${tenantId}`);

        return { message: 'Product deleted successfully' };
    }
}
