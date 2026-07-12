import { createHash, randomUUID } from "node:crypto";

import { type Evidence } from "../domain/schemas.js";

const redactedHeaders = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "payment-signature",
  "payment-response",
  "x-api-key",
]);

export function evidenceId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function previewBody(value: string, maxLength = 2048): string | undefined {
  if (!value) return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    output[key] = redactedHeaders.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  return output;
}

export function makeScannerEvidence(summary: string, data?: Record<string, unknown>): Evidence {
  return {
    id: evidenceId("ev"),
    kind: "scanner",
    summary,
    timestamp: isoNow(),
    data,
  };
}
