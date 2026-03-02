# MediStock — SaaS Medical Inventory & Pharmacy System

> A production-ready, multi-tenant SaaS application for medical inventory management and pharmacy stock control. Built with NestJS, Next.js 14, PostgreSQL, and real-time WebSocket notifications.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red?logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)

---

## Overview

MediStock enables clinics, pharmacies, and healthcare facilities to manage their medical inventory with full multi-tenant isolation — each tenant's data is completely separated and never accessible to other tenants.

**Key Capabilities:**
- 📦 Real-time stock tracking with low-stock and out-of-stock alerts
- 🔒 Multi-tenant architecture with JWT-based RBAC (Owner / Admin / Pharmacist / Viewer)
- 📋 Immutable stock movement ledger with compensating entries
- 📊 Dashboard with inventory stats, expiry monitoring, and audit logs
- 🔔 WebSocket push notifications for real-time stock alerts
- 🛡️ OWASP-compliant security (Helmet, CORS, rate limiting, bcrypt, input validation)

---

## Architecture

```
SaaS-Medical-Inventory-Pharmacy-System/
├── apps/
│   ├── api/               # NestJS REST API + WebSocket Gateway
│   └── web/               # Next.js 14 App Router Frontend
├── packages/
│   ├── shared-types/      # Zod schemas + TypeScript types
│   ├── shared-utils/      # Date, pagination, currency utilities
│   └── config/            # Shared ESLint + tsconfig
├── prisma/
│   ├── schema.prisma      # Database schema (9 models)
│   └── seed.ts            # Demo data seeder
├── docs/
│   ├── API.md             # REST + WebSocket API reference
│   └── SECURITY.md        # OWASP compliance and security docs
├── pnpm-workspace.yaml
└── turbo.json
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | NestJS 11, TypeScript 5.7 |
| Database ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Authentication | JWT (access 15m + refresh 7d rotation) |
| Real-time | Socket.io (WebSocket) |
| Validation | Zod (frontend + backend) |
| Monorepo | TurboRepo + pnpm workspaces |
| Testing | Jest (unit + integration + e2e) |

### Request Lifecycle

```
Client → Rate Limiter → Helmet/CORS → JwtGuard → TenantGuard → RoleGuard → ZodValidationPipe → Controller → Service → Repository → Prisma → PostgreSQL
                                                                                                                                          ↓
                                                                                                                              LoggingInterceptor (AuditLog)
```

### Domain Model

```
Tenant ──< TenantUser >── User
  │
  ├──< Product
  ├──< Inventory ──< InventoryItem
  ├──< StockMovement
  └──< AuditLog
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- pnpm 9+ (`npm install -g pnpm`)

### 1. Clone & Install

```bash
git clone https://github.com/satriohp/SaaS-Medical-Inventory-Pharmacy-System.git
cd SaaS-Medical-Inventory-Pharmacy-System

# Install dependencies
cd apps/api && npm install
cd ../web && npm install
```

### 2. Configure Environment

```bash
# Copy and edit the example env file
cp apps/api/.env.example apps/api/.env
```

Required variables in `apps/api/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/medistock"
JWT_SECRET="your-super-secret-jwt-key-min-16-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-16-chars"
CORS_ORIGIN="http://localhost:3000"
PORT=3001
NODE_ENV=development
```

### 3. Setup Database

```bash
cd apps/api

# Push schema to database
npx prisma db push

# Seed with demo data
npx ts-node prisma/seed.ts
```

### 4. Run Development Servers

```bash
# Backend (http://localhost:3001)
cd apps/api
npm run dev

# Frontend (http://localhost:3000)
cd apps/web
npm run dev
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | `admin@demo.com` | `Admin123` |
| Pharmacist | `pharmacist@demo.com` | `Admin123` |

---

## Features

### Multi-Tenant Architecture
- Complete data isolation — tenant A **cannot** access tenant B's data
- `tenantId` extracted from **JWT payload only** (never from request body)
- All Prisma queries are automatically scoped per tenant

### Stock Movement Ledger
- **Immutable** — no UPDATE or DELETE endpoints for movements
- Movement types: `IN`, `OUT`, `ADJUSTMENT`, `RETURN`, `EXPIRED`
- Compensating entries for corrections (preserves audit trail)

### Real-Time Alerts
- WebSocket gateway with tenant-scoped rooms
- Auto-disconnect clients without valid `tenantId`
- Events: `stock:low`, `stock:out`, `stock:updated`

### RBAC Roles
| Role | Permissions |
|------|------------|
| `OWNER` | Full access including member management |
| `ADMIN` | Manage products, inventory, movements |
| `PHARMACIST` | Create movements, view inventory |
| `VIEWER` | Read-only access |

---

## API Reference

Full API documentation available in [`docs/API.md`](docs/API.md).

**Base URL:** `http://localhost:3001/api`

Key endpoints:

```
POST   /api/auth/register        Create tenant + owner account
POST   /api/auth/login           Login
GET    /api/products             List products (search, pagination)
POST   /api/stock-movements      Create stock movement (immutable)
GET    /api/inventory/dashboard  Dashboard stats
GET    /api/audit-logs           Audit trail (read-only)
```

---

## Testing

```bash
cd apps/api

# Unit tests
npm run test:unit

# Integration tests (requires test DB)
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:cov
```

---

## Security

See [`docs/SECURITY.md`](docs/SECURITY.md) for full OWASP compliance documentation.

| Control | Status |
|---------|--------|
| Input Validation | ✅ Zod on all endpoints |
| Authentication | ✅ JWT with token rotation |
| Authorization | ✅ RBAC with RoleGuard |
| Tenant Isolation | ✅ All queries scoped by tenantId |
| Rate Limiting | ✅ ThrottlerModule (100 req/60s) |
| Security Headers | ✅ Helmet |
| Password Hashing | ✅ bcrypt (cost=12) |
| Audit Logging | ✅ Every write operation logged |

---

## Project Structure (Backend)

```
apps/api/src/
├── app.module.ts
├── main.ts
├── config/              # env.config.ts, security.config.ts
├── prisma/              # PrismaService, PrismaModule
├── common/
│   ├── decorators/      # @CurrentUser, @TenantId, @Roles
│   ├── filters/         # GlobalExceptionFilter
│   ├── guards/          # JwtGuard, TenantGuard, RoleGuard
│   ├── interceptors/    # LoggingInterceptor, TransformInterceptor
│   └── pipes/           # ZodValidationPipe
└── modules/
    ├── auth/            # Register, login, refresh, logout
    ├── tenant/          # Tenant management, member RBAC
    ├── product/         # Product CRUD
    ├── inventory/       # Stock tracking, alerts
    ├── stock-movement/  # Immutable ledger
    ├── audit/           # Audit log queries
    └── notification/    # WebSocket gateway
```

---

## License

MIT © 2025 MediStock
