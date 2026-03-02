# Security Implementation Guide

## OWASP Compliance Status

| Control | Status | Implementation |
|---------|--------|----------------|
| Input Validation | ✅ Implemented | Zod + ZodValidationPipe on all endpoints |
| Authentication (JWT) | ✅ Implemented | JwtGuard — access + refresh token rotation |
| Authorization (RBAC) | ✅ Implemented | RoleGuard + @Roles decorator per endpoint |
| Tenant Data Isolation | ✅ Implemented | TenantMiddleware — all queries scoped by tenantId |
| Rate Limiting | ✅ Implemented | @nestjs/throttler — global ThrottlerGuard |
| Security Headers | ✅ Implemented | Helmet middleware in main.ts |
| Password Hashing | ✅ Implemented | bcrypt with cost factor 12 |
| Audit Logging | ✅ Implemented | LoggingInterceptor — always on, writes to AuditLog |
| No Sensitive Data in Response | ✅ Implemented | TransformInterceptor strips passwordHash |
| Secret Management | 🔧 Local | .env file (Infisical/Doppler for production) |
| HTTPS / TLS | 🔧 Nginx | SSL termination at reverse proxy layer |

## Multi-Tenant Security Rules

### MUST DO
- Every Prisma query MUST include `{ where: { tenantId } }`
- tenantId MUST be extracted from **JWT payload** — never from request body
- TenantMiddleware MUST run before every authenticated route
- Audit log MUST be created for every write operation

### NEVER DO
- Query without tenantId filter (security breach)
- Trust tenantId sent in request body or query params
- Bypass TenantMiddleware "for development convenience"
- Skip audit log

## Request Lifecycle
```
Incoming Request
  → Rate Limiter (per IP + per tenant)
  → Helmet/CORS headers
  → JwtGuard (validate token, extract userId + tenantId)
  → TenantMiddleware (verify user is member of claimed tenant)
  → RoleGuard (@Roles decorator check)
  → ZodValidationPipe (validate + sanitize body)
  → Controller → Service → Repository
  → LoggingInterceptor (write AuditLog after response)
  → Response
```

## JWT Configuration
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Refresh token rotation: old token invalidated on refresh
- Storage: HttpOnly cookies recommended for production

## Password Policy
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- bcrypt cost factor: 12 (≈250ms hash time)
