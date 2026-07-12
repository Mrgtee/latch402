# latch402 Research Notes

Verification date: 2026-07-12.

latch402 is built for the OKX Build X Series as a real OKX.AI A2MCP ASP: a paid x402 scanner that probes live HTTP endpoints and returns an evidence-backed security report. It does not fabricate paid-flow results; passive findings come from observed HTTP traffic, and active checks only run when a real signer, wallet, network, and spend cap are configured.

## OKX Build X Requirements

Source: https://web3.okx.com/xlayer/build-x-series

Required submission work:

- Build and run a live Agent Service Provider (ASP), not a slide deck or demo-only mock.
- Submit the ASP to the OKX.AI marketplace/listing flow and pass OKX review.
- Publish an X post using `#OKXAI`.
- Submit the final form before 2026-07-17 23:59 UTC.
- Target category for latch402: Software Utility.

## OKX A2MCP Shape

Source: https://web3.okx.com/onchainos/dev-docs/okxai/howtomcp

A2MCP services must expose callable APIs. A paid service must return HTTP `402 Payment Required` when called without payment material, then return the real service result after the client replays the request with payment. For OKX review, latch402 exposes:

- `GET /health` as a free health check.
- `GET /openapi.json` as free machine-readable API metadata.
- `POST /api/v1/scan` as the paid scanner endpoint.
- `GET /api/v1/reports/:runId` as a token-gated report fetch endpoint.

## OKX x402 Payment SDK

Source: https://web3.okx.com/onchainos/dev-docs/payments/service-seller-sdk

The Node implementation uses the OKX payment middleware packages:

- `@okxweb3/x402-express`
- `@okxweb3/x402-core`
- `@okxweb3/x402-evm`

Production payment defaults:

- Network: `eip155:196` (X Layer mainnet)
- Price: `0.05` USD per scan
- Seller address: `PAY_TO_ADDRESS`
- Public URL base: `LATCH402_PUBLIC_BASE_URL`

## Networks And Assets

Source: https://web3.okx.com/onchainos/dev-docs/payments/supported-networks

Supported payment network targets for scanner validation:

| Purpose         | CAIP-2        | Chain ID |
| --------------- | ------------- | -------- |
| X Layer mainnet | `eip155:196`  | `196`    |
| X Layer testnet | `eip155:1952` | `1952`   |

Accepted X Layer assets:

| Asset | Address                                      |
| ----- | -------------------------------------------- |
| USDG  | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` |
| USDt0 | `0x779ded0c9e1022225f8e0630b35a9b54be713736` |

## x402 Protocol Headers

Source: https://docs.x402.org/core-concepts/http-402

x402 V2 HTTP flows use these headers:

- `PAYMENT-REQUIRED`: server challenge on a 402 response.
- `PAYMENT-SIGNATURE`: client payment authorization on replay.
- `PAYMENT-RESPONSE`: server settlement or payment result metadata.

latch402 accepts protocol data from either headers or documented JSON bodies because implementations in the field vary. It flags missing, malformed, duplicate, or version-confused payment metadata.

## Security Research Grounding

Sources:

- Five Attacks on x402: https://ar5iv.labs.arxiv.org/html/2605.11781v1
- Free-Riding x402: https://arxiv.org/abs/2605.30998
- PII-safe x402: https://arxiv.org/abs/2604.11430

Scanner coverage derived from current x402 security research:

- Replay and idempotency weaknesses.
- Missing resource binding between payment and protected endpoint.
- Cache leakage of paid responses or payment challenges.
- Settlement-before-grant ambiguity.
- Header confusion across x402 versions and duplicate payment headers.
- PII in payment metadata.
- Discovery or marketplace metadata that can steer clients toward unsafe payment terms.
