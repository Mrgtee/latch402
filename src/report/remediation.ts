import { type Finding } from "../domain/schemas.js";

const snippets: Partial<Record<Finding["category"], string[]>> = {
  X402_CHALLENGE_INVALID: [
    "Express: mount OKX paymentMiddleware before the paid route and verify unpaid calls return HTTP 402 with PAYMENT-REQUIRED.",
    "FastAPI: return status_code=402 with a base64 x402 challenge before executing paid work.",
  ],
  OKX_NETWORK_OR_ASSET_MISMATCH: [
    "Use network eip155:196 for production or eip155:1952 for testnet, and advertise USDG or USDt0 asset addresses exactly.",
  ],
  PAYMENT_HEADER_VERSION_MISMATCH: [
    "Reject mixed x402 versions and normalize on PAYMENT-REQUIRED, PAYMENT-SIGNATURE, and PAYMENT-RESPONSE for V2 flows.",
  ],
  RESOURCE_BINDING_MISSING: [
    "Bind payment requirements to the canonical URL and HTTP method, then compare them before granting paid content.",
  ],
  IDEMPOTENCY_REPLAY_RISK: [
    "Persist payment nonce/signature IDs and reject reuse after the first successful settlement or fulfilled replay.",
  ],
  CACHE_LEAKAGE_RISK: [
    'nginx: add_header Cache-Control "no-store" always; proxy_no_cache $http_payment_signature; proxy_cache_bypass $http_payment_signature;',
    "Cloudflare: create a cache rule that bypasses cache for paid endpoints and any request with PAYMENT-SIGNATURE.",
  ],
  SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE: [
    "Return PAYMENT-RESPONSE with transaction status and grant paid content only after successful or explicitly pending settlement semantics.",
  ],
  PAYMENT_METADATA_PII: [
    "Replace email, phone, name, and address metadata with opaque request IDs; keep PII in your application database only.",
  ],
  DISCOVERY_METADATA_STEERING_RISK: [
    "Keep marketplace/discovery metadata signed or controlled by the service owner and avoid client-selected payTo, asset, or network fields.",
  ],
  HTTPS_OR_PUBLIC_ENDPOINT_INVALID: [
    "Deploy the ASP behind public HTTPS and block private, loopback, link-local, and metadata IP ranges at the scanner boundary.",
  ],
};

export function remediationForFindings(findings: Finding[]): string[] {
  return [
    ...new Set([
      ...findings.flatMap((finding) => finding.remediation),
      ...findings.flatMap((finding) => snippets[finding.category] ?? []),
    ]),
  ];
}

export function remediationSnippetsByCategory(findings: Finding[]): Record<string, string[]> {
  const categories = [...new Set(findings.map((finding) => finding.category))];
  return Object.fromEntries(categories.map((category) => [category, snippets[category] ?? []]));
}
