# OKX Submission Pack

## Listing

Name: latch402

Category: Software Utility

Short description: Paid x402 red-team scanner for finding payment-flow bugs before OKX.AI listing review.

Long description:

latch402 is an OKX.AI A2MCP ASP that scans live x402-protected endpoints for payment-flow weaknesses. It verifies unpaid 402 behavior, x402 V2 headers, X Layer network and asset readiness, resource binding, replay/idempotency risk, cache leakage, settlement metadata, and PII leakage in payment metadata. Passive scans never spend funds. Active scans require explicit authorization, a real configured wallet, and a local spend cap.

Endpoint: `POST https://YOUR_DOMAIN/api/v1/scan`

OpenAPI: `GET https://YOUR_DOMAIN/openapi.json`

Price: `$0.05` per scan

Network: `eip155:196`

## Review Checklist

- [ ] Public deployment is HTTPS.
- [ ] `GET /health` returns `200`.
- [ ] `GET /openapi.json` returns machine-readable schema.
- [ ] Unpaid `POST /api/v1/scan` returns `402 Payment Required` in production.
- [ ] The 402 includes `PAYMENT-REQUIRED` or x402 challenge body metadata.
- [ ] Paid replay returns a real `ScanReport`.
- [ ] Report includes findings, evidence, OKX readiness, remediation, and Markdown.
- [ ] X post with `#OKXAI` is published.
- [ ] Final Build X form is submitted before 2026-07-17 23:59 UTC.

## Demo Narrative

1. Show `/health` and `/openapi.json`.
2. Send unpaid request to `/api/v1/scan` and show HTTP 402.
3. Pay/replay through an x402-capable client.
4. Show generated JSON report.
5. Show Markdown report evidence table.
6. Show active mode refusal when spend gates are not configured.
7. Show active mode testnet run only after funded wallet and cap are configured.
