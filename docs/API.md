# REST API Reference

Base URL: `http://localhost:3001/api`

## Authentication

All protected endpoints require: `Authorization: Bearer <accessToken>`

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Create tenant + owner account |
| POST | `/auth/login` | Public | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Public | Rotate refresh token |
| POST | `/auth/logout` | JWT | Invalidate refresh token |
| GET | `/auth/profile` | JWT | Get current user profile |

## Tenant

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/tenant` | JWT+Tenant | Any | Get tenant info |
| PATCH | `/tenant` | JWT+Tenant | OWNER/ADMIN | Update tenant settings |
| GET | `/tenant/members` | JWT+Tenant | OWNER/ADMIN | List tenant members |
| POST | `/tenant/members` | JWT+Tenant | OWNER | Invite new member |
| PATCH | `/tenant/members/:userId/role` | JWT+Tenant | OWNER | Change member role |
| DELETE | `/tenant/members/:userId` | JWT+Tenant | OWNER | Remove member |

## Products

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/products` | JWT+Tenant | Any | List products (search, pagination) |
| POST | `/products` | JWT+Tenant | OWNER/ADMIN | Create product |
| GET | `/products/:id` | JWT+Tenant | Any | Get product by ID |
| PATCH | `/products/:id` | JWT+Tenant | OWNER/ADMIN | Update product |
| DELETE | `/products/:id` | JWT+Tenant | OWNER | Soft-delete product |

## Inventory

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/inventory` | JWT+Tenant | Any | List inventory with stock status |
| GET | `/inventory/dashboard` | JWT+Tenant | Any | Dashboard stats (totals, alerts) |

## Stock Movements (Immutable Ledger)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/stock-movements` | JWT+Tenant | Any | List movements (filter by type, product) |
| POST | `/stock-movements` | JWT+Tenant | PHARMACIST+ | Create new movement (IN/OUT/ADJUSTMENT/RETURN/EXPIRED) |
| GET | `/stock-movements/:id` | JWT+Tenant | Any | Get movement by ID |
| POST | `/stock-movements/:id/compensate` | JWT+Tenant | OWNER/ADMIN | Create compensating entry |

> **Note:** Stock movements are IMMUTABLE. No UPDATE or DELETE endpoints exist.

## Audit Logs

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/audit-logs` | JWT+Tenant | OWNER/ADMIN | List audit logs (read-only) |

## Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "2025-03-02T16:25:05.000Z"
}
```

## Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "error": "BadRequestException",
  "message": "Validation failed",
  "timestamp": "2025-03-02T16:25:05.000Z"
}
```

## WebSocket Events

Connect: `ws://localhost:3001/notifications?tenantId=<tenantId>`

| Event (Server → Client) | Payload | Trigger |
|--------------------------|---------|---------|
| `stock:low` | `{ productName, sku, currentQuantity, minStock }` | Stock drops below minStock |
| `stock:out` | `{ productName, sku }` | Stock reaches 0 |
| `stock:updated` | `{ productId, newQuantity }` | Any stock movement |
