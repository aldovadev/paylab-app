# Copilot Instructions for pay-gate-simulator

## Project Overview

Turborepo monorepo with NestJS backend + Next.js frontend for simulating payment gateway flows (Stripe, PayPal).

## Architecture

- `apps/api/` -- NestJS 11 backend. TypeORM + PostgreSQL. Stripe SDK + PayPal SDK + Mock engine.
- `apps/web/` -- Next.js 16 (App Router). shadcn/ui + Tailwind v4. Redux Toolkit.
- `packages/shared/` -- Shared types/enums consumed by both apps.

## Code Style

- Single-line comments only (`//`). No `/* */` or `""" """`.
- No emojis in code, comments, commits, or docs.
- Use class-validator decorators on DTOs. Use Joi for env config validation.
- Entity hierarchy: DefaultBaseEntity > BaseEntity > EditableBaseEntity (UUID PK, timestamps, soft delete).

## Backend Conventions

- Modules follow NestJS standard: `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- Gateway adapters implement `PaymentGatewayAdapter` interface from shared package.
- `GatewayRegistryService` maps providers to adapters.
- `PaymentService` resolves adapter based on `GatewayConfigEntity.mode` (SANDBOX or MOCK).
- API keys stored encrypted (AES-256-GCM) in `gateway_config.sandbox_credentials`.
- All endpoints wrapped by `ResponseInterceptor` and `HttpExceptionFilter`.

## Frontend Conventions

- App Router with `(dashboard)` route group for sidebar layout.
- Redux Toolkit for state management. Async thunks for API calls.
- `apiClient` (Axios) configured in `src/lib/api-client.ts`.
- SSE via custom `useWebhookStream` hook for real-time webhook events.
- shadcn/ui components in `src/components/ui/`.

## Build Commands

- `npm run dev` -- Start all apps in dev mode (Turborepo)
- `npm run build` -- Build all apps and packages
- `npx turbo build` -- Same as above, explicit Turborepo invocation
- `npm run lint` -- Lint all apps
