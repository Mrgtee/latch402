import {
  OKX_SUPPORTED_ASSET_ADDRESSES,
  OKX_SUPPORTED_NETWORKS,
  type OkxSupportedNetwork,
} from "../domain/constants.js";
import {
  getChallengeRequirements,
  type X402Challenge,
  type X402PaymentRequirement,
} from "../domain/schemas.js";

const caip2Pattern = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/;
const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;

export function isCaip2Network(value: string | undefined): value is string {
  return Boolean(value && caip2Pattern.test(value));
}

export function isOkxSupportedNetwork(value: string | undefined): value is OkxSupportedNetwork {
  return Boolean(value && (OKX_SUPPORTED_NETWORKS as readonly string[]).includes(value));
}

export function normalizeAssetAddress(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^0X/, "0x");
  return evmAddressPattern.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

export function isOkxSupportedAsset(value: string | undefined): boolean {
  const normalized = normalizeAssetAddress(value);
  return Boolean(normalized && OKX_SUPPORTED_ASSET_ADDRESSES.includes(normalized));
}

export function challengeNetworks(challenge: X402Challenge): string[] {
  return [
    ...new Set(
      getChallengeRequirements(challenge)
        .map((requirement) => requirement.network)
        .filter(Boolean),
    ),
  ] as string[];
}

export function challengeAssets(challenge: X402Challenge): string[] {
  return [
    ...new Set(
      getChallengeRequirements(challenge)
        .map((requirement) => normalizeAssetAddress(requirement.asset))
        .filter(Boolean),
    ),
  ] as string[];
}

export function hasOkxCompatibleRequirement(challenge: X402Challenge): boolean {
  return getChallengeRequirements(challenge).some(
    (requirement) =>
      isOkxSupportedNetwork(requirement.network) && isOkxSupportedAsset(requirement.asset),
  );
}

export function hasExpectedNetwork(
  challenge: X402Challenge,
  expectedNetwork: string | undefined,
): boolean {
  if (!expectedNetwork) return true;
  return getChallengeRequirements(challenge).some(
    (requirement) => requirement.network === expectedNetwork,
  );
}

export function hasExpectedAsset(
  challenge: X402Challenge,
  expectedAssets: string[] | undefined,
): boolean {
  if (!expectedAssets || expectedAssets.length === 0) return true;
  const expected = expectedAssets.map((asset) => normalizeAssetAddress(asset)).filter(Boolean);
  if (expected.length === 0) return false;
  return getChallengeRequirements(challenge).some((requirement) => {
    const asset = normalizeAssetAddress(requirement.asset);
    return Boolean(asset && expected.includes(asset));
  });
}

function canonicalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }
    if (url.pathname === "") {
      url.pathname = "/";
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function resourceMatchesTarget(
  requirement: X402PaymentRequirement,
  targetUrl: string,
  method: string,
): boolean {
  if (!requirement.resource) return false;

  const target = canonicalUrl(targetUrl);
  const resource = canonicalUrl(requirement.resource);
  if (!target || !resource || target !== resource) {
    return false;
  }

  const requirementMethod =
    typeof requirement.extra?.method === "string"
      ? requirement.extra.method
      : typeof requirement["method"] === "string"
        ? requirement["method"]
        : undefined;

  return !requirementMethod || requirementMethod.toUpperCase() === method.toUpperCase();
}

export function hasResourceBinding(
  challenge: X402Challenge,
  targetUrl: string,
  method: string,
): boolean {
  return getChallengeRequirements(challenge).some((requirement) =>
    resourceMatchesTarget(requirement, targetUrl, method),
  );
}

export function challengeVersionIsV2(challenge: X402Challenge): boolean {
  return (
    challenge.x402Version === undefined ||
    challenge.x402Version === 2 ||
    challenge.x402Version === "2"
  );
}
