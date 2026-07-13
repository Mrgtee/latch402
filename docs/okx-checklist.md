# OKX Readiness Checklist

Use this checklist before submitting latch402 to OKX.AI and the Build X final form.

## Live ASP

- [ ] Public HTTPS deployment is reachable.
- [ ] `GET /health` returns `200` with service metadata.
- [ ] `GET /openapi.json` returns an OpenAPI 3.1 document.
- [ ] `POST /api/v1/scan` is live and performs real HTTP probing.
- [ ] Passive scans use live network evidence and do not use mocks.
- [ ] Active scans run only with an explicit wallet, signer, network, and spend cap.

## Paid x402 Endpoint

- [ ] `POST /api/v1/scan` is protected by the OKX x402 middleware in production.
- [ ] A request without payment returns HTTP `402 Payment Required`.
- [ ] The 402 response includes `PAYMENT-REQUIRED` or a body containing x402 challenge metadata.
- [ ] A valid paid replay returns a real `ScanReport`.
- [ ] The paid replay includes `PAYMENT-RESPONSE` when settlement metadata is available.
- [ ] Production payment network is `eip155:196`.
- [ ] Production price is `$0.05` per scan.
- [ ] `PAY_TO_ADDRESS` is set to the seller wallet.
- [ ] Supported assets include X Layer USDG and USDt0.

## Submission Pack

- [ ] OKX.AI listing title: `latch402`.
- [ ] Category: Software Utility.
- [ ] Listing description explains black-box x402 payment-flow security scanning.
- [ ] Listing includes public endpoint URL and OpenAPI URL.
- [ ] Demo script shows unpaid 402 challenge and paid scan replay.
- [ ] X post includes `#OKXAI`.
- [ ] Final form submitted before 2026-07-17 23:59 UTC.

## Required Environment

- [ ] `NODE_ENV=production`
- [ ] `LATCH402_PUBLIC_BASE_URL`
- [ ] `PAY_TO_ADDRESS`
- [ ] `OKX_API_KEY`
- [ ] `OKX_SECRET_KEY`
- [ ] `OKX_PASSPHRASE`
- [ ] `X402_NETWORK=eip155:196`
- [ ] `X402_PRICE_USD=0.05`

## Optional Active Scanning

- [ ] `SCAN_ACTIVE_PAYMENTS_ENABLED=true`
- [ ] `EVM_PRIVATE_KEY` belongs to a funded test wallet first.
- [ ] `SCAN_SPEND_CAP_USD` is set.
- [ ] `X_LAYER_RPC_URL` is set for receipt lookup: `https://rpc.xlayer.tech` for X Layer mainnet or `https://testrpc.xlayer.tech` for testnet.
- [ ] Mainnet active scans are enabled only after a manual environment switch.
