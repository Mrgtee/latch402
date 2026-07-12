export const OKX_X_LAYER_MAINNET = "eip155:196";
export const OKX_X_LAYER_TESTNET = "eip155:1952";

export const OKX_SUPPORTED_NETWORKS = [OKX_X_LAYER_MAINNET, OKX_X_LAYER_TESTNET] as const;

export const OKX_SUPPORTED_ASSETS = {
  USDG: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
  USDT0: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
} as const;

export const OKX_SUPPORTED_ASSET_ADDRESSES = Object.values(OKX_SUPPORTED_ASSETS).map((address) =>
  address.toLowerCase(),
);

export const X402_HEADER_NAMES = {
  paymentRequired: "payment-required",
  paymentSignature: "payment-signature",
  paymentResponse: "payment-response",
} as const;

export const FINDING_CATEGORIES = [
  "X402_CHALLENGE_INVALID",
  "OKX_NETWORK_OR_ASSET_MISMATCH",
  "PAYMENT_HEADER_VERSION_MISMATCH",
  "RESOURCE_BINDING_MISSING",
  "IDEMPOTENCY_REPLAY_RISK",
  "CACHE_LEAKAGE_RISK",
  "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
  "PAYMENT_METADATA_PII",
  "DISCOVERY_METADATA_STEERING_RISK",
  "HTTPS_OR_PUBLIC_ENDPOINT_INVALID",
] as const;

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

export type OkxSupportedNetwork = (typeof OKX_SUPPORTED_NETWORKS)[number];
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];
export type Severity = (typeof SEVERITIES)[number];
