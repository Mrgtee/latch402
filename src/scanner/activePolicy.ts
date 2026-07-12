import { type AppConfig } from "../config.js";
import { OKX_SUPPORTED_ASSET_ADDRESSES } from "../domain/constants.js";
import { type ScanRequest, type X402PaymentRequirement } from "../domain/schemas.js";
import { normalizeAssetAddress } from "../x402/validators.js";

export type ActiveGateResult = { ok: true } | { ok: false; reasons: string[] };

export type SpendDecision =
  { ok: true; estimatedUsd: number } | { ok: false; reason: string; estimatedUsd?: number };

const privateKeyPattern = /^0x[a-fA-F0-9]{64}$/;

export function evaluateActiveGates(request: ScanRequest, config: AppConfig): ActiveGateResult {
  const reasons: string[] = [];
  if (!config.activePaymentsEnabled) reasons.push("SCAN_ACTIVE_PAYMENTS_ENABLED is not true");
  if (request.authorizationConfirmed !== true) reasons.push("authorizationConfirmed must be true");
  if (!config.evmPrivateKey || !privateKeyPattern.test(config.evmPrivateKey)) {
    reasons.push("EVM_PRIVATE_KEY is missing or invalid");
  }
  if (config.scanSpendCapUsd <= 0) reasons.push("SCAN_SPEND_CAP_USD must be greater than zero");
  if (!config.activeNetwork) reasons.push("X402_ACTIVE_NETWORK is missing");
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

function parseDollarPrice(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^\$?([0-9]+(?:\.[0-9]+)?)$/);
  return match ? Number(match[1]) : undefined;
}

function parseAtomicStablecoinAmount(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return undefined;
  return Number(BigInt(text)) / 1_000_000;
}

export function estimateRequirementUsd(
  requirement: X402PaymentRequirement | Record<string, unknown>,
): number | undefined {
  const directPrice = parseDollarPrice(requirement["price"]);
  if (directPrice !== undefined) return directPrice;

  const extra = requirement["extra"];
  if (extra && typeof extra === "object") {
    const extraPrice = parseDollarPrice((extra as Record<string, unknown>)["price"]);
    if (extraPrice !== undefined) return extraPrice;
  }

  return (
    parseAtomicStablecoinAmount(requirement["amount"]) ??
    parseAtomicStablecoinAmount(requirement["maxAmountRequired"])
  );
}

export function evaluateSpendPolicy(
  requirement: X402PaymentRequirement | Record<string, unknown>,
  config: AppConfig,
): SpendDecision {
  const network = requirement["network"];
  if (network !== config.activeNetwork) {
    return {
      ok: false,
      reason: `requirement network ${String(network)} does not match ${config.activeNetwork}`,
    };
  }

  const asset = normalizeAssetAddress(
    typeof requirement["asset"] === "string" ? requirement["asset"] : undefined,
  );
  if (!asset || !OKX_SUPPORTED_ASSET_ADDRESSES.includes(asset)) {
    return { ok: false, reason: "requirement asset is not an OKX-supported X Layer stablecoin" };
  }

  const estimatedUsd = estimateRequirementUsd(requirement);
  if (estimatedUsd === undefined || !Number.isFinite(estimatedUsd)) {
    return { ok: false, reason: "requirement price could not be estimated; refusing to spend" };
  }

  if (estimatedUsd > config.scanSpendCapUsd) {
    return {
      ok: false,
      reason: `estimated price $${estimatedUsd.toFixed(6)} exceeds SCAN_SPEND_CAP_USD $${config.scanSpendCapUsd.toFixed(6)}`,
      estimatedUsd,
    };
  }

  return { ok: true, estimatedUsd };
}
