import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type PublicTargetCheck =
  { ok: true; url: URL; addresses: string[] } | { ok: false; reason: string; addresses?: string[] };

const blockedHostnames = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const value = address.toLowerCase();
  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80") ||
    value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:127.") ||
    value.startsWith("::ffff:169.254.") ||
    value.startsWith("::ffff:192.168.")
  );
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

function isAllowedByHostAllowlist(hostname: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  const normalized = hostname.toLowerCase();
  return allowlist.some((allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`));
}

export async function assertPublicHttpsUrl(
  targetUrl: string,
  allowlist?: string[],
): Promise<PublicTargetCheck> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return { ok: false, reason: "targetUrl is not a valid URL" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "targetUrl must use HTTPS" };
  }

  if (url.username || url.password) {
    return { ok: false, reason: "targetUrl must not contain credentials" };
  }

  const hostname = url.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost")) {
    return { ok: false, reason: "target hostname is local-only" };
  }

  if (!isAllowedByHostAllowlist(hostname, allowlist)) {
    return { ok: false, reason: "target hostname is not in TARGET_ALLOWLIST" };
  }

  const directIpFamily = isIP(hostname);
  if (directIpFamily !== 0) {
    return isPrivateAddress(hostname)
      ? { ok: false, reason: "target resolves to a private or reserved IP", addresses: [hostname] }
      : { ok: true, url, addresses: [hostname] };
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    const addresses = records.map((record) => record.address);
    if (addresses.length === 0) {
      return { ok: false, reason: "target hostname did not resolve" };
    }
    if (addresses.some((address) => isPrivateAddress(address))) {
      return { ok: false, reason: "target resolves to a private or reserved IP", addresses };
    }
    return { ok: true, url, addresses };
  } catch (error) {
    return { ok: false, reason: `DNS lookup failed: ${(error as Error).message}` };
  }
}
