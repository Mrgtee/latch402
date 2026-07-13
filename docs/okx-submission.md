# OKX.AI Listing Submission Pack - latch402

## Official Requirement Status

- Campaign: OKX.AI Genesis, Build X Series.
- Deadline: July 17, 2026 at 23:59 UTC.
- Required path: list the ASP on OKX.AI, publish an X post with `#OKXAI` and a clear demo or walkthrough no longer than 90 seconds, then submit the Build X Google Form with ASP details and the X post link.
- Service type: A2MCP, x402 pay-per-call endpoint.
- Category: Software Utility.
- Public app: `https://latch402-production.up.railway.app/`
- Paid endpoint: `POST https://latch402-production.up.railway.app/api/v1/scan`
- OpenAPI schema: `GET https://latch402-production.up.railway.app/openapi.json`
- Health check: `GET https://latch402-production.up.railway.app/health`
- Price: `$0.05` per scan.
- Settlement network: X Layer mainnet, `eip155:196`.
- Settlement asset: USDt0, `0x779ded0c9e1022225f8e0630b35a9b54be713736`.

## OKX.AI Listing Fields

Name:

```text
latch402
```

Category:

```text
Software Utility
```

Service type:

```text
A2MCP paid API / x402 pay-per-call
```

Price:

```text
$0.05 per call
```

Endpoint:

```text
https://latch402-production.up.railway.app/api/v1/scan
```

Website / demo URL:

```text
https://latch402-production.up.railway.app/
```

OpenAPI URL:

```text
https://latch402-production.up.railway.app/openapi.json
```

Short description:

```text
Evidence-backed x402 security scanner that tests live paid endpoints for 402 challenge, resource-binding, replay, cache, metadata, settlement, and OKX/X Layer readiness issues.
```

Long description:

```text
latch402 is a paid A2MCP security utility for teams launching x402 services on OKX.AI. Given a public endpoint and authorization, it runs black-box passive probes against the live HTTP/payment flow, decodes x402 V2 payment requirements, checks X Layer network and token configuration, verifies HTTPS resource binding, flags replay/idempotency risk, cache leakage, malformed-header behavior, settlement metadata gaps, and PII-like data in payment metadata.

The result is a deterministic risk score, severity-ranked findings, raw HTTP/payment evidence, an OKX readiness verdict, and concrete remediation steps. Passive mode never spends funds. Active payment probes are gated by explicit authorization, wallet configuration, and spend caps so the service can be used responsibly during pre-listing review.
```

Suggested user prompts:

```text
Scan my paid x402 endpoint for OKX.AI readiness.
```

```text
Check whether my PAYMENT-REQUIRED challenge is bound to the correct HTTPS resource and X Layer asset.
```

```text
Find replay, cache, settlement, and metadata risks before I list my ASP.
```

Example request payload:

```json
{
  "targetUrl": "https://example.com",
  "method": "GET",
  "mode": "passive",
  "expectedNetwork": "eip155:196",
  "authorizationConfirmed": true
}
```

## Review Self-Check

Run this before submitting the listing:

```bash
curl -i -X POST https://latch402-production.up.railway.app/api/v1/scan \
  -H "content-type: application/json" \
  --data-binary '{"targetUrl":"https://example.com","method":"GET","mode":"passive","expectedNetwork":"eip155:196","authorizationConfirmed":true}'
```

Expected unpaid result:

- `HTTP 402 Payment Required`.
- `PAYMENT-REQUIRED` response header is present.
- Decoded challenge has `x402Version: 2`.
- `resource.url` is `https://latch402-production.up.railway.app/api/v1/scan`.
- `accepts[0].network` is `eip155:196`.
- `accepts[0].asset` is USDt0 `0x779ded0c9e1022225f8e0630b35a9b54be713736`.
- `accepts[0].amount` is `50000`, equal to `$0.05` with 6 decimals.

Optional browser checks:

```text
https://latch402-production.up.railway.app/
https://latch402-production.up.railway.app/health
https://latch402-production.up.railway.app/openapi.json
```

## Onchain OS Registration Steps

1. Install Onchain OS and log in with the Agentic Wallet email:

```text
Install Onchain OS via npx skills add okx/onchainos-skills --yes -g, then log in to Agentic Wallet with my email
```

2. Register latch402 as an A2MCP ASP:

```text
Help me register an A2MCP ASP on OKX.AI using OKX Agent Identity from Onchain OS
```

Paste the listing fields from this document when asked for name, description, price, and endpoint.

3. Submit the marketplace listing:

```text
Help me list my ASP on OKX.AI using Onchain OS
```

OKX says review results are sent to the email registered with Agentic Wallet.

## X Post Draft

```text
Launching latch402 for #OKXAI: an evidence-backed x402 red-team scanner for builders listing paid ASPs on OKX.AI.

It probes live endpoints for 402 challenge validity, HTTPS resource binding, OKX/X Layer token readiness, replay/idempotency risk, cache leakage, settlement metadata gaps, and PII-like payment metadata.

Live app: https://latch402-production.up.railway.app/
Paid A2MCP endpoint: https://latch402-production.up.railway.app/api/v1/scan
```

## 90-Second Demo Script

- 0-10s: Open `https://latch402-production.up.railway.app/` and introduce latch402 as an x402 security scanner for OKX.AI builders.
- 10-25s: Show `/health` and `/openapi.json` to prove the API is live and machine-readable.
- 25-45s: Paste a target URL in the web UI and run an unpaid preflight.
- 45-60s: Show the decoded `PAYMENT-REQUIRED` challenge: HTTPS resource URL, `eip155:196`, USDt0, and `$0.05`.
- 60-80s: Explain that a paid replay returns a real evidence-backed report with findings, score, OKX readiness, and remediation.
- 80-90s: Close with the user value: scan your x402 endpoint before listing so review issues become fixable evidence, not guesswork.

## Final Build X Form Checklist

- ASP name: `latch402`.
- Category: `Software Utility`.
- Service URL: `https://latch402-production.up.railway.app/`.
- Endpoint URL: `https://latch402-production.up.railway.app/api/v1/scan`.
- OpenAPI URL: `https://latch402-production.up.railway.app/openapi.json`.
- Price: `$0.05`.
- Network: `eip155:196`.
- Asset: USDt0.
- X post link: add after posting.
- Contact/support: add the email, X handle, or Telegram handle you want OKX and users to use.

## Human-Only Items Still Needed

- Confirm the Railway deployment is running the latest `main` commit.
- Log in to Agentic Wallet with your own email.
- Submit the OKX.AI listing through Onchain OS.
- Record and publish the X demo post with `#OKXAI`.
- Paste the X post link into the Build X Google Form before July 17, 2026 at 23:59 UTC.
- Choose the public support contact to put in the listing.
