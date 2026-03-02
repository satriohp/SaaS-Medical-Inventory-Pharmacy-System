import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

/**
 * E2E test: Full stock-in flow
 * Blueprint Section 7.2: stock-flow.e2e.spec.ts
 *
 * Happy path: login → stock in → verify inventory update → alert check
 *
 * NOTE: Requires running PostgreSQL database with TEST_DATABASE_URL.
 * Skip individual tests with .skip if DB not available in CI.
 */
describe('Stock Flow (E2E)', () => {
    let app: INestApplication;
    let accessToken: string;
    let tenantId: string;
    let productId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    // Step 1: Register + Login
    it('POST /api/auth/register → create demo tenant + user', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/auth/register')
            .send({
                email: `test-${Date.now()}@e2e.test`,
                password: 'TestPass123',
                tenantName: 'E2E Test Clinic',
                tenantSlug: `e2e-${Date.now()}`,
            });

        expect(res.status).toBe(201);
        expect(res.body.data.accessToken).toBeDefined();
        accessToken = res.body.data.accessToken;
        tenantId = res.body.data.tenant?.id;
    });

    // Step 2: Create product
    it('POST /api/products → create a product for stock testing', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/products')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'E2E Paracetamol', sku: `E2E-${Date.now()}`, unit: 'tablet', minStock: 10 });

        expect(res.status).toBe(201);
        productId = res.body.data.id;
    });

    // Step 3: Stock IN
    it('POST /api/stock-movements → stock in should update inventory', async () => {
        if (!productId) return;

        const res = await request(app.getHttpServer())
            .post('/api/stock-movements')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ productId, type: 'IN', quantity: 50, reference: 'E2E-PO-001' });

        expect(res.status).toBe(201);
        expect(res.body.data.inventory.currentQuantity).toBe(50);
    });

    // Step 4: Verify inventory reflects the movement
    it('GET /api/inventory → should show updated stock quantity', async () => {
        if (!productId) return;

        const res = await request(app.getHttpServer())
            .get('/api/inventory')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        const items = res.body.data.items;
        const item = items.find((i: any) => i.productId === productId);
        expect(item?.totalQuantity).toBe(50);
    });

    // Step 5: Stock OUT below minStock — should trigger threshold (verified in unit tests)
    it('POST /api/stock-movements → stock out below minStock should succeed', async () => {
        if (!productId) return;

        const res = await request(app.getHttpServer())
            .post('/api/stock-movements')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ productId, type: 'OUT', quantity: 45 }); // Leaves 5, below minStock of 10

        expect(res.status).toBe(201);
        expect(res.body.data.inventory.isLowStock).toBe(true);
    });
});
