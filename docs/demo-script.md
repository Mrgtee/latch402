# 90-Second Demo Script

0:00 - Introduce latch402 as a paid x402 red-team scanner for OKX.AI builders.

0:10 - Open `/openapi.json` and show the callable A2MCP shape.

0:20 - Run an unpaid curl against `/api/v1/scan`; point out HTTP 402 and `PAYMENT-REQUIRED`.

0:35 - Replay with a paid x402 client and show the returned `ScanReport`.

0:50 - Highlight findings: network/asset readiness, resource binding, replay risk, cache policy, settlement metadata, and PII metadata.

1:10 - Show the Markdown report and remediation snippets for Express, FastAPI, nginx, and Cloudflare-style deployments.

1:25 - Close with why it wins: it helps OKX.AI ASP teams fix payment bugs before review, and it charges through the same x402 flow it audits.
