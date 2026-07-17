# Deployment Guide

latch402 is an Express + TypeScript ASP. Production should run behind public HTTPS with OKX x402 payment mode enabled.

## Build

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Run Locally Without Payment

```bash
LATCH402_PAYMENT_MODE=off NODE_ENV=development corepack pnpm dev
```

## Run With OKX Payment Gate

Set the required environment variables from `.env.example`, then run:

```bash
NODE_ENV=production LATCH402_PAYMENT_MODE=okx corepack pnpm build
NODE_ENV=production LATCH402_PAYMENT_MODE=okx node dist/src/server.js
```

Production defaults:

- Paid routes: `GET /api/v1/scan` and `POST /api/v1/scan`
- Price: `$0.05`
- Network: `eip155:196`
- Seller wallet: `PAY_TO_ADDRESS`
- Supported OKX/X Layer assets are validated by the scanner.

## Docker

```bash
docker build -t latch402 .
docker run --env-file .env -p 4020:4020 latch402
```

## Public Self-Checks

Health:

```bash
curl -i https://YOUR_DOMAIN/health
```

OpenAPI:

```bash
curl -i https://YOUR_DOMAIN/openapi.json
```

Unpaid paid-endpoint checks. In production both commands must return HTTP 402 with `PAYMENT-REQUIRED`:

```bash
curl -i https://YOUR_DOMAIN/api/v1/scan

curl -i -X POST https://YOUR_DOMAIN/api/v1/scan   -H 'content-type: application/json'   -d '{"targetUrl":"https://TARGET_DOMAIN/paid","mode":"passive","authorizationConfirmed":true}'
```

Development scanner check with payment disabled:

```bash
curl -i -X POST http://localhost:4020/api/v1/scan   -H 'content-type: application/json'   -d '{"targetUrl":"https://TARGET_DOMAIN/paid","mode":"passive","authorizationConfirmed":true}'
```

## Active Scan Safety

Active scans create real payment payloads only when all gates pass:

- `SCAN_ACTIVE_PAYMENTS_ENABLED=true`
- `authorizationConfirmed=true`
- `EVM_PRIVATE_KEY` is set
- `SCAN_SPEND_CAP_USD` is greater than zero
- The target challenge matches `X402_ACTIVE_NETWORK`
- The estimated price is at or below `SCAN_SPEND_CAP_USD`

Start with `X402_ACTIVE_NETWORK=eip155:1952` and `X_LAYER_RPC_URL=https://testrpc.xlayer.tech`. Move to `X402_ACTIVE_NETWORK=eip155:196` and `X_LAYER_RPC_URL=https://rpc.xlayer.tech` only after manual review.
