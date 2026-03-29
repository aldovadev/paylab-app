<div align="center">

<img src="apps/web/public/logos/paylab.svg" alt="PayLab" width="80" height="80" />

# PayLab

Multi-gateway payment simulator for Stripe and PayPal.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e.svg)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://docs.docker.com/compose)

</div>

## Table of Contents

- [About](#about)
- [Built With](#built-with)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Test Scenarios](#test-scenarios)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Google OAuth (Optional)](#google-oauth-optional)
- [Environment Variables](#environment-variables)
- [Development Rules](#development-rules)
- [License](#license)

## About

PayLab provides a controlled environment to test real payment gateway APIs without processing actual transactions. It connects to Stripe Test Mode and PayPal Sandbox, executing real API calls against their test environments to validate integration logic, error handling, and webhook delivery.

## Built With

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + npm workspaces |
| **Backend** | NestJS 11, TypeORM, PostgreSQL 17, Redis 7 |
| **Frontend** | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, Magic UI, Redux Toolkit |
| **Stripe** | Stripe SDK v17 (Test Mode) |
| **PayPal** | PayPal Server SDK v2 (Sandbox) |
| **Auth** | Google OAuth 2.0 (optional), Passport, JWT |
| **Shared** | TypeScript types, enums, and interfaces package |
| **Infra** | Docker Compose, ngrok (webhook tunneling) |

## Features

- **Animated Landing Page** - Particles background, AuroraText headings, and Magic UI components
- **Multi-Gateway Support** - Stripe and PayPal with a unified adapter interface
- **20 Pre-Built Test Scenarios** - 10 Stripe + 10 PayPal covering success, decline, and error cases
- **PayPal Negative Testing** - Uses `PayPal-Mock-Response` headers to simulate capture-time and create-time failures
- **Stripe Test Cards** - Full catalog of Stripe test PaymentMethod tokens for various outcomes
- **Webhook Processing** - Receives and verifies webhooks from both gateways via ngrok tunnel
- **Real-Time Dashboard** - Monitor transactions, webhook events, and gateway metrics with Magic UI cards
- **Optional Google OAuth** - Protect dashboard with Google sign-in, enabled via environment flag
- **Docker-Ready** - Full-stack deployment with a single `docker compose up`

## Project Structure

```
pay-gate-simulator/
  apps/
    api/                # NestJS backend (port 3100)
      src/
        gateways/       # Stripe & PayPal adapter implementations
        payment/        # Payment service, controller, entities
        webhooks/       # Webhook receiver & SSE streaming
        database/       # TypeORM config & migrations
        common/         # Shared utilities, interceptors, filters
    web/                # Next.js frontend (port 3200)
      src/
        app/
          (dashboard)/
            simulator/  # 4-step payment test wizard
            transactions/ # Transaction history
            webhooks/   # Webhook event log
            metrics/    # Gateway analytics
            paypal/     # PayPal return & cancel pages
        data/           # Test scenario catalog
        store/          # Redux Toolkit slices
        components/     # UI components (sidebar, icons)
  packages/
    shared/             # Shared TypeScript types & enums
```

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- ngrok account (free tier, for webhook tunneling)

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/aldovadev/pay-gate-simulator.git
cd pay-gate-simulator

# Configure environment
cp .env.example .env
# Edit .env with your encryption key and gateway credentials

# Start all services
docker compose up
```

| Service | URL |
|---------|-----|
| API | http://localhost:3100/api |
| Swagger Docs | http://localhost:3100/api/docs |
| Web Dashboard | http://localhost:3200 |
| PostgreSQL | localhost:5450 |
| Redis | localhost:6390 |

### Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis via Docker
docker compose up postgres redis -d

# Configure environment
cp .env.example .env

# Run all apps in dev mode
npm run dev
```

### Webhook Tunneling (ngrok)

To receive webhooks from Stripe/PayPal sandbox in local development:

```bash
# Start ngrok tunnel (uses static domain from .env)
npm run tunnel

# Register the ngrok URL in your Stripe/PayPal dashboard:
# Stripe: https://dashboard.stripe.com/test/webhooks
# PayPal: https://developer.paypal.com/dashboard/notifications/webhooks
```

## Test Scenarios

### Stripe (10 scenarios)

| Scenario | Token | Expected |
|----------|-------|----------|
| Visa - Success | `pm_card_visa` | succeeded |
| Mastercard - Success | `pm_card_mastercard` | succeeded |
| Generic Decline | `pm_card_chargeDeclined` | failed |
| Insufficient Funds | `pm_card_chargeDeclinedInsufficientFunds` | failed |
| Lost Card | `pm_card_chargeDeclinedLostCard` | failed |
| Stolen Card | `pm_card_chargeDeclinedStolenCard` | failed |
| Expired Card | `pm_card_chargeDeclinedExpiredCard` | failed |
| Processing Error | `pm_card_chargeDeclinedProcessingError` | failed |
| 3D Secure Required | `pm_card_threeDSecureRequired` | pending |
| Dispute / Chargeback | `pm_card_createDispute` | succeeded |

### PayPal (10 scenarios)

| Scenario | Mock Code | Phase | Expected |
|----------|-----------|-------|----------|
| PayPal Checkout | - | - | pending |
| PayPal Large Order | - | - | pending |
| Instrument Declined | `INSTRUMENT_DECLINED` | capture | failed |
| Transaction Refused | `TRANSACTION_REFUSED` | capture | failed |
| Payer Cannot Pay | `PAYER_CANNOT_PAY` | capture | failed |
| Duplicate Invoice ID | `DUPLICATE_INVOICE_ID` | capture | failed |
| Already Captured | `ORDER_ALREADY_CAPTURED` | capture | failed |
| Max Payment Attempts | `MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED` | capture | failed |
| Internal Server Error | `INTERNAL_SERVER_ERROR` | create | failed |
| Permission Denied | `PERMISSION_DENIED` | create | failed |

PayPal negative testing uses the `PayPal-Mock-Response` header with `mock_application_codes` to simulate errors in the sandbox environment. Create-phase errors fail immediately at order creation. Capture-phase errors create the order normally, redirect to PayPal for buyer approval, then fail when the capture is attempted.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/payments/charge` | Create a payment charge |
| `GET` | `/api/payments/charge/:provider/:chargeId` | Get charge status |
| `POST` | `/api/payments/capture/paypal/:orderId` | Capture a PayPal order |
| `POST` | `/api/payments/refund` | Refund a charge |
| `GET` | `/api/payments/transactions` | List transactions (paginated) |
| `GET` | `/api/payments/webhook-events` | List webhook events (paginated) |
| `GET` | `/api/payments/metrics` | Gateway analytics |
| `POST` | `/api/webhooks/:provider` | Receive webhook from provider |
| `POST` | `/api/webhooks/simulate/:provider` | Simulate a webhook event |
| `GET` | `/api/webhooks/events/stream` | SSE stream for real-time events |

## Architecture

### Gateway Adapter Pattern

Each payment gateway implements the `PaymentGatewayAdapter` interface:

```typescript
interface PaymentGatewayAdapter {
  readonly provider: PaymentProvider;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getChargeStatus(chargeId: string): Promise<ChargeStatusResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(headers: Record<string, string>, body: string): Promise<WebhookEvent>;
}
```

The `GatewayRegistryService` resolves the correct adapter at runtime based on the provider specified in the request.

### PayPal Checkout Flow

1. Frontend sends `POST /api/payments/charge` with `provider: "paypal"`
2. Backend creates a PayPal order via SDK, returns `redirectUrl`
3. User is redirected to PayPal sandbox for buyer approval
4. PayPal redirects back to `/paypal/return?token=ORDER_ID`
5. Frontend calls `POST /api/payments/capture/paypal/:orderId`
6. Backend captures the order, updates transaction status

For negative testing scenarios, the mock code is stored in transaction metadata during step 2 and applied as a `PayPal-Mock-Response` header during step 6.

## Google OAuth (Optional)

Dashboard access can be protected with Google sign-in. This is disabled by default — the dashboard is fully open without authentication.

### Enable

Set these variables in `.env`:

```env
ENABLE_GOOGLE_AUTH=true
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3100/api/auth/google/callback
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3200
```

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3100/api/auth/google/callback` as an authorized redirect URI
4. Copy the Client ID and Client Secret to `.env`

### How It Works

When enabled, the frontend `AuthGuard` component checks for a valid JWT token before allowing access to dashboard routes. Unauthenticated users are redirected to the login page, which initiates a Google OAuth flow. The backend issues a JWT after successful Google authentication.

When disabled (`ENABLE_GOOGLE_AUTH=false`), the guard passes all requests through and the dashboard is fully accessible without authentication.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes | 64-char hex key for credential encryption |
| `STRIPE_SECRET_KEY` | No | Stripe test mode secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook endpoint secret |
| `PAYPAL_CLIENT_ID` | No | PayPal sandbox client ID |
| `PAYPAL_CLIENT_SECRET` | No | PayPal sandbox client secret |
| `PAYPAL_WEBHOOK_ID` | No | PayPal webhook ID for verification |
| `NGROK_DOMAIN` | No | Static ngrok domain for webhook tunneling |
| `ENABLE_GOOGLE_AUTH` | No | Enable Google OAuth (`true`/`false`, default `false`) |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | No | Frontend auth flag (must match backend) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (required when auth enabled) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret (required when auth enabled) |
| `GOOGLE_CALLBACK_URL` | No | OAuth callback URL (default: `http://localhost:3100/api/auth/google/callback`) |
| `JWT_SECRET` | No | JWT signing secret (required when auth enabled) |
| `FRONTEND_URL` | No | Frontend URL for OAuth redirect (default: `http://localhost:3200`) |

## Development Rules

- All comments must be single-line (`//`). No multi-line comment blocks.
- Follow existing patterns in the codebase for new modules.
- Use `class-validator` for DTO validation, `Joi` for env config validation.
- Never commit credentials. Use `.env` for secrets.
- Run `npx turbo build` before committing to verify zero compile errors.
- Database entities extend `EditableBaseEntity` (UUID PK, timestamps, soft delete).

## Bug Fix Guidelines

1. Check terminal/build output for the exact error message.
2. Identify the file and line from the stack trace.
3. Verify entity fields match database columns (TypeORM sync in dev).
4. Run `npx turbo build` after fixing to verify no cascading issues.
5. Test the fix via Swagger (http://localhost:3100/api/docs) or the web dashboard.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
