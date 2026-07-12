# latch402

`latch402` is a real x402 red-team scanner built for OKX.AI A2MCP. It probes live paid endpoints, validates their `402 Payment Required` flow, and returns evidence-backed security reports for payment bugs such as invalid challenges, network or asset mismatch, resource binding gaps, replay exposure, cache leakage, and unsafe settlement behavior.

The production `POST /api/v1/scan` endpoint is intended to be protected by the OKX Payment SDK on X Layer. Passive scans do not spend funds. Active scans are disabled unless explicitly configured with a wallet and spend cap.

## Scripts

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm test
```

## Endpoints

- `GET /health`
- `GET /openapi.json`
- `POST /api/v1/scan`
- `GET /api/v1/reports/:runId`

