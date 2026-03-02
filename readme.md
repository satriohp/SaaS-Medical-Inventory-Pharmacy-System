# SaaS Medical Inventory & Pharmacy Management System

A multi-tenant SaaS-ready medical inventory and pharmacy management system built with modern enterprise architecture using NestJS, Next.js, Prisma, and PostgreSQL.

> Designed as a scalable, modular, and production-oriented system following industry best practices.

---

## Overview

This project is a domain-driven system for managing:

- Multi-tenant pharmacy operations
- Inventory and stock management
- Product lifecycle
- Stock movement tracking
- Role-based access control (RBAC)
- Audit logging

The system is built with SaaS architecture principles:

- Tenant isolation
- Modular design
- Clean separation of concerns
- Shared type safety between frontend and backend

---

## Architecture
Monorepo structure:

apps/
├── api (NestJS backend)
└── web (Next.js frontend)

packages/
└── shared (Shared types and schemas)

prisma/
└── schema.prisma

### Backend (NestJS)

- Modular architecture
- Guards (JWT, Role, Tenant)
- Interceptors, Pipes, Filters
- Domain modules:
  - Auth
  - Tenant
  - Inventory
  - Product
  - Stock Movement
  - Audit
  - Notification

### Frontend (Next.js)

- App Router
- Component-based structure
- Shared types integration

### Database

- PostgreSQL
- Prisma ORM
- Centralized schema management

---

## Core Design Principles

### Multi-Tenant Awareness

- Tenant guard enforcement
- Context-based request handling
- Tenant-scoped data access

### Domain Separation

- Inventory → manages stock state
- Stock Movement → handles transactional logs
- Audit → tracks system activity

### Role-Based Access Control

- JWT authentication
- Role-based authorization
- Extensible permission system

### Audit & Traceability

- Activity logging
- System transparency
- Compliance-ready structure

---

## Tech Stack

### Backend
- NestJS
- Prisma ORM
- PostgreSQL
- TypeScript

### Frontend
- Next.js (App Router)
- TypeScript

### Architecture
- Monorepo
- Shared types package
- Modular design

---

## Features

- Authentication (JWT)
- Multi-tenant system
- Product management
- Inventory management
- Stock movement tracking
- Audit logging
- Notification module (in progress)


