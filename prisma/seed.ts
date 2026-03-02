/**
 * Prisma Database Seed
 * Run: npx ts-node prisma/seed.ts (from project root)
 *
 * Creates:
 * - 1 demo tenant (admin-clinic)
 * - 1 OWNER user  (admin@demo.com / Admin123)
 * - 1 default inventory warehouse
 * - 5 sample products
 */

import { PrismaClient, Role } from '.prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ============================================================
    // 1. TENANT
    // ============================================================
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'admin-clinic' },
        update: {},
        create: {
            name: 'Admin Demo Clinic',
            slug: 'admin-clinic',
        },
    });
    console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

    // ============================================================
    // 2. OWNER USER
    // ============================================================
    const passwordHash = await bcrypt.hash('Admin123', 12);

    const user = await prisma.user.upsert({
        where: { email: 'admin@demo.com' },
        update: {},
        create: {
            email: 'admin@demo.com',
            passwordHash,
            name: 'Demo Admin',
        },
    });
    console.log(`✅ User: ${user.email} (${user.id})`);

    // ============================================================
    // 3. TENANT MEMBERSHIP
    // ============================================================
    await prisma.tenantUser.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
        update: {},
        create: {
            userId: user.id,
            tenantId: tenant.id,
            role: Role.OWNER,
        },
    });
    console.log(`✅ TenantUser: OWNER membership created`);

    // ============================================================
    // 4. DEFAULT INVENTORY
    // ============================================================
    const inventory = await prisma.inventory.upsert({
        where: { id: `inv-${tenant.id}` },
        update: {},
        create: {
            id: `inv-${tenant.id}`,
            tenantId: tenant.id,
            name: 'Main Warehouse',
        },
    });
    console.log(`✅ Inventory: ${inventory.name} (${inventory.id})`);

    // ============================================================
    // 5. SAMPLE PRODUCTS
    // ============================================================
    const products = [
        { name: 'Paracetamol 500mg', sku: 'PCT-500', category: 'Analgesic', unit: 'tablet', minStock: 100 },
        { name: 'Amoxicillin 500mg', sku: 'AMX-500', category: 'Antibiotic', unit: 'capsule', minStock: 50 },
        { name: 'Omeprazole 20mg', sku: 'OMP-020', category: 'Antacid', unit: 'capsule', minStock: 30 },
        { name: 'Metformin 500mg', sku: 'MET-500', category: 'Antidiabetic', unit: 'tablet', minStock: 60 },
        { name: 'Ibuprofen 400mg', sku: 'IBU-400', category: 'Analgesic', unit: 'tablet', minStock: 80 },
    ];

    for (const p of products) {
        const product = await prisma.product.upsert({
            where: { tenantId_sku: { tenantId: tenant.id, sku: p.sku } },
            update: {},
            create: {
                tenantId: tenant.id,
                name: p.name,
                sku: p.sku,
                category: p.category,
                unit: p.unit,
                minStock: p.minStock,
            },
        });

        // Add initial stock (200 units each)
        const existing = await prisma.inventoryItem.findFirst({
            where: { inventoryId: inventory.id, productId: product.id },
        });

        if (!existing) {
            await prisma.inventoryItem.create({
                data: {
                    inventoryId: inventory.id,
                    productId: product.id,
                    quantity: 200,
                    batchNumber: `BATCH-INIT-${p.sku}`,
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                },
            });

            // Log the initial stock movement
            await prisma.stockMovement.create({
                data: {
                    tenantId: tenant.id,
                    productId: product.id,
                    type: 'IN',
                    quantity: 200,
                    batchNumber: `BATCH-INIT-${p.sku}`,
                    reference: 'SEED-INITIAL',
                    notes: 'Initial stock from database seed',
                    performedBy: user.id,
                },
            });
        }

        console.log(`✅ Product: ${product.name} (${product.sku})`);
    }

    console.log('\n🎉 Seeding complete!');
    console.log('\n📋 Login credentials:');
    console.log('   Email:    admin@demo.com');
    console.log('   Password: Admin123');
    console.log(`   TenantId: ${tenant.id}\n`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
