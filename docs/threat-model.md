# latch402 Threat Model

latch402 is a black-box scanner for x402 payment-protected HTTP endpoints. It observes protocol behavior from outside the target service and reports only evidence it can collect from real requests, responses, headers, payment metadata, and optional on-chain receipts.

## Assets Protected

- Paid endpoint content and service execution.
- Payment challenge integrity.
- Payment replay authorization.
- Settlement evidence.
- User and seller payment metadata.
- OKX.AI discovery/listing trust.

## Trust Boundaries

- Scanner client to target endpoint over HTTPS.
- Target endpoint to x402 facilitator/payment network.
- Target endpoint to caches, CDNs, gateways, and reverse proxies.
- Scanner to X Layer RPC when receipt lookup is configured.

## Scanner Modes

Passive mode never spends funds. It sends unpaid and malformed requests, records live HTTP behavior, parses x402 metadata, validates OKX payment readiness, checks cache semantics, and flags metadata privacy risks.

Active mode may spend real funds only when all gates pass:

- `SCAN_ACTIVE_PAYMENTS_ENABLED=true`
- Request has `authorizationConfirmed: true`
- `SCAN_SPEND_CAP_USD` is configured and sufficient
- Wallet/signer configuration is present
- Network is explicit, with testnet preferred before mainnet

If any active gate fails, latch402 records that active evidence is unavailable. It does not invent paid replay, settlement, or on-chain evidence.

## Finding Categories

| Category                                    | Risk                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `X402_CHALLENGE_INVALID`                    | The endpoint does not return a usable x402 challenge.                  |
| `OKX_NETWORK_OR_ASSET_MISMATCH`             | Payment network or asset does not match OKX/X Layer expectations.      |
| `PAYMENT_HEADER_VERSION_MISMATCH`           | Header or body metadata mixes incompatible x402 versions.              |
| `RESOURCE_BINDING_MISSING`                  | Payment challenge is not clearly bound to the protected URL/method.    |
| `IDEMPOTENCY_REPLAY_RISK`                   | Paid requests may be replayable or duplicated unsafely.                |
| `CACHE_LEAKAGE_RISK`                        | Paid challenges or paid content may be stored by shared caches.        |
| `SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE` | Service access may be granted before settlement is observable.         |
| `PAYMENT_METADATA_PII`                      | Payment metadata includes email, phone, name, address, or similar PII. |
| `DISCOVERY_METADATA_STEERING_RISK`          | Discovery/listing metadata can steer clients to unsafe payment terms.  |
| `HTTPS_OR_PUBLIC_ENDPOINT_INVALID`          | Target URL is not public HTTPS or is unreachable.                      |

## Severity Model

Critical findings indicate likely payment bypass, public leakage of paid content, or unsafe active settlement behavior.

High findings indicate a broken paid endpoint, non-OKX network/asset mismatch, replay exposure, or missing resource binding.

Medium findings indicate ambiguous protocol behavior, cache weakness, metadata privacy risk, or settlement uncertainty.

Low findings indicate hardening gaps, missing optional metadata, or non-blocking OKX readiness issues.

## Non-Goals

- latch402 does not attack private networks or internal services.
- latch402 does not brute-force payment signatures.
- latch402 does not bypass authorization unrelated to x402 payment flow.
- latch402 does not spend production funds unless active mode is explicitly enabled and capped.
