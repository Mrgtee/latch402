# latch402

**latch402 is a paid x402 red-team scanner for OKX.AI A2MCP services.**

It black-box tests live HTTP endpoints for payment-flow weaknesses, then returns an
evidence-backed security report with findings, protocol evidence, OKX readiness checks,
and remediation guidance.

Production ASP:

- Base URL: `https://latch402-production.up.railway.app`
- Web UI: `GET /`
- Paid endpoint: `POST /api/v1/scan`
- OpenAPI: `GET /openapi.json`
- Price: `$0.05` per scan
- Network: X Layer mainnet, `eip155:196`
- Payment scheme: x402 v2 `exact`
- Accepted asset: USDt0, `0x779ded0c9e1022225f8e0630b35a9b54be713736`

## Why It Exists

x402 turns HTTP APIs into pay-per-call services, but payment-gated endpoints can still
fail in subtle ways: weak resource binding, replayable authorizations, cache leakage,
network or asset mismatch, malformed payment metadata, unsafe settlement assumptions,
and PII exposure in payment challenges.

latch402 gives builders, reviewers, and listing teams a real scanner for those risks.
It does not invent results. Reports are generated only from observed HTTP responses,
x402 metadata, configured payment evidence, and optional X Layer receipt checks.

## Current Verification

The production Railway deployment has been verified with an unpaid request:

```bash
curl -i -X POST https://latch402-production.up.railway.app/api/v1/scan \
  -H "content-type: application/json" \
  --data-binary '{"targetUrl":"https://example.com","mode":"passive","authorizationConfirmed":true}'
```

Expected production behavior:

- `HTTP/2 402`
- `payment-required` response header
- `x402Version: 2`
- `resource.url: https://latch402-production.up.railway.app/api/v1/scan`
- `accepts[0].network: eip155:196`
- `accepts[0].amount: 50000`
- `accepts[0].asset: 0x779ded0c9e1022225f8e0630b35a9b54be713736`

## Web UI

Open the live console:

```bash
https://latch402-production.up.railway.app/
```

The UI checks service health, builds scan requests, runs the real unpaid `402` preflight, decodes `payment-required`, and fetches stored reports by `runId` and `reportToken`.

## API

### Health

```bash
curl -i https://latch402-production.up.railway.app/health
```

Returns:

```json
{
  "ok": true,
  "service": "latch402",
  "version": "0.1.0"
}
```

### OpenAPI

```bash
curl -i https://latch402-production.up.railway.app/openapi.json
```

### Run A Scan

`POST /api/v1/scan` is paid in production. An unpaid request returns `402 Payment Required`.
After a valid x402 payment, the same request is replayed and returns a `ScanReport`.

Request:

```json
{
  "targetUrl": "https://example.com",
  "method": "GET",
  "mode": "passive",
  "authorizationConfirmed": true
}
```

Fields:

| Field                    | Required | Description                                                                                   |
| ------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `targetUrl`              | Yes      | Public HTTPS endpoint to scan. Private IPs and local addresses are blocked.                   |
| `method`                 | No       | `GET` or `POST`. Defaults to `GET`.                                                           |
| `headers`                | No       | Optional headers to send to the target. Sensitive payment headers are controlled by latch402. |
| `body`                   | No       | Optional JSON body for `POST` target probes.                                                  |
| `mode`                   | Yes      | `passive` or `active`. Passive never spends funds.                                            |
| `expectedNetwork`        | No       | Expected target network, usually `eip155:196`.                                                |
| `expectedAssets`         | No       | Expected target token addresses.                                                              |
| `authorizationConfirmed` | Yes      | Must be `true` to confirm permission to scan the target.                                      |

Response shape:

```json
{
  "runId": "scan_...",
  "targetUrl": "https://example.com",
  "mode": "passive",
  "score": 82,
  "verdict": "warn",
  "findings": [],
  "evidence": [],
  "okxReadiness": {
    "pass": true,
    "missing": []
  },
  "remediation": [],
  "markdown": "..."
}
```

### Fetch A Stored Report

Reports are stored with a generated report token.

```bash
curl -i "https://latch402-production.up.railway.app/api/v1/reports/RUN_ID?token=REPORT_TOKEN"
```

## Scanner Coverage

latch402 checks for:

- Invalid or missing x402 `402 Payment Required` challenges
- OKX/X Layer network or asset mismatches
- x402 header version mismatch
- Missing resource binding
- Replay and idempotency risk
- Cache leakage risk
- Settlement uncertainty or unsafe grant behavior
- PII-like data in payment metadata
- Discovery/listing metadata steering risk
- Non-public, non-HTTPS, or unreachable target endpoints

## Passive vs Active Mode

Passive mode is the default and safest path. It sends live unpaid probes and malformed
payment-header probes, parses x402 metadata, validates OKX readiness, and records HTTP
evidence. It never creates or submits a payment.

Active mode can create real payment payloads and replay paid requests only when every
safety gate passes:

- `SCAN_ACTIVE_PAYMENTS_ENABLED=true`
- `authorizationConfirmed=true`
- `EVM_PRIVATE_KEY` is configured
- `SCAN_SPEND_CAP_USD` is greater than zero
- The target challenge matches `X402_ACTIVE_NETWORK`
- The estimated spend is at or below `SCAN_SPEND_CAP_USD`

Mainnet active scans use:

```env
X402_ACTIVE_NETWORK=eip155:196
X_LAYER_RPC_URL=https://rpc.xlayer.tech
```

## Security Controls

- SSRF protection blocks private, loopback, link-local, multicast, and local network targets.
- Production payment is handled by the OKX x402 SDK.
- `.env` is ignored; secrets are never committed.
- Payment, signature, response, API key, passphrase, and private key fields are redacted from logs.
- Request timeouts and response-size limits are enforced.
- Rate limiting is enabled on `POST /api/v1/scan`.
- Express trusts Railway's first proxy so x402 resource URLs bind to public HTTPS.

## Environment

Minimum production configuration:

```env
NODE_ENV=production
PORT=4020
LATCH402_PUBLIC_BASE_URL=https://latch402-production.up.railway.app
LATCH402_PAYMENT_MODE=auto

PAY_TO_ADDRESS=0x...
OKX_API_KEY=...
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
OKX_FACILITATOR_BASE_URL=https://web3.okx.com

X402_NETWORK=eip155:196
X402_PRICE_USD=0.05

SCAN_ACTIVE_PAYMENTS_ENABLED=false
SCAN_SPEND_CAP_USD=0.10
X402_ACTIVE_NETWORK=eip155:196
X_LAYER_RPC_URL=https://rpc.xlayer.tech
```

Notes:

- `OKX_FACILITATOR_BASE_URL` may be omitted; when set, use `https://web3.okx.com`.
- Do not use `https://web3.okx.com/facilitator`.
- Keep `SCAN_ACTIVE_PAYMENTS_ENABLED=false` for public review unless you intentionally want
  the deployed scanner to perform capped mainnet active probes.

## Local Development

Install dependencies:

```bash
corepack pnpm install
```

Run without payment:

```bash
LATCH402_PAYMENT_MODE=off NODE_ENV=development corepack pnpm dev
```

Build and start production output:

```bash
corepack pnpm build
NODE_ENV=production corepack pnpm start
```

## Quality Gates

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Current suite includes parser, payment config, passive scanner, active policy, report
engine, rate limit, config, health, and payment-response tests.

## Docker

```bash
docker build -t latch402 .
docker run --env-file .env -p 4020:4020 latch402
```

## OKX.AI Listing Summary

- Name: `latch402`
- Category: Software Utility
- Description: Paid x402 red-team scanner for finding payment-flow bugs before OKX.AI listing review.
- Endpoint: `POST https://latch402-production.up.railway.app/api/v1/scan`
- OpenAPI: `GET https://latch402-production.up.railway.app/openapi.json`
- Price: `$0.05`
- Network: `eip155:196`
- Token: USDt0

## Repository Safety

The repository intentionally tracks `.env.example` only. Do not commit `.env`, private
keys, OKX credentials, wallet mnemonics, or deployment secrets.
