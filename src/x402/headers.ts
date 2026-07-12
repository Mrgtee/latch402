import { z } from "zod";

import { X402_HEADER_NAMES } from "../domain/constants.js";
import {
  type X402Challenge,
  type X402PaymentResponse,
  x402ChallengeSchema,
  x402PaymentResponseSchema,
} from "../domain/schemas.js";
import { decodeBase64JsonHeader, type DecodedJsonHeader } from "./base64.js";

export type HeaderMap = Record<string, string>;

export type ParsedX402Header<T> =
  | { ok: true; source: "header" | "body"; decoded: DecodedJsonHeader & { ok: true }; value: T }
  | { ok: false; source: "header" | "body" | "none"; error: string; decoded?: DecodedJsonHeader };

export function normalizeHeaderMap(
  input: Headers | Record<string, string | string[] | undefined>,
): HeaderMap {
  const output: HeaderMap = {};
  if (input instanceof Headers) {
    input.forEach((value, key) => {
      output[key.toLowerCase()] = value;
    });
    return output;
  }

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      output[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      output[key.toLowerCase()] = value.join(", ");
    }
  }
  return output;
}

export function getHeaderValue(headers: Headers | HeaderMap, name: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
  }
  return headers[name.toLowerCase()];
}

function parseBodyJson(bodyText: string): unknown | undefined {
  const trimmed = bodyText.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function parseDecoded<T>(
  decoded: DecodedJsonHeader,
  schema: z.ZodSchema<T>,
  source: "header" | "body",
): ParsedX402Header<T> {
  if (!decoded.ok) {
    return { ok: false, source, error: decoded.error, decoded };
  }

  const parsed = schema.safeParse(decoded.data);
  if (!parsed.success) {
    return {
      ok: false,
      source,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
      decoded,
    };
  }

  return { ok: true, source, decoded, value: parsed.data };
}

export function parsePaymentRequired(
  headers: Headers | HeaderMap,
  bodyText = "",
): ParsedX402Header<X402Challenge> {
  const headerValue = getHeaderValue(headers, X402_HEADER_NAMES.paymentRequired);
  if (headerValue) {
    return parseDecoded(decodeBase64JsonHeader(headerValue), x402ChallengeSchema, "header");
  }

  const bodyJson = parseBodyJson(bodyText);
  if (bodyJson !== undefined) {
    return parseDecoded(
      { ok: true, raw: bodyText, jsonText: bodyText, data: bodyJson, sourceEncoding: "json" },
      x402ChallengeSchema,
      "body",
    );
  }

  return { ok: false, source: "none", error: "missing PAYMENT-REQUIRED header and x402 JSON body" };
}

export function parsePaymentResponse(
  headers: Headers | HeaderMap,
): ParsedX402Header<X402PaymentResponse> {
  const headerValue = getHeaderValue(headers, X402_HEADER_NAMES.paymentResponse);
  if (!headerValue) {
    return { ok: false, source: "none", error: "missing PAYMENT-RESPONSE header" };
  }

  return parseDecoded(decodeBase64JsonHeader(headerValue), x402PaymentResponseSchema, "header");
}

export function hasPaymentSignature(headers: Headers | HeaderMap): boolean {
  return Boolean(getHeaderValue(headers, X402_HEADER_NAMES.paymentSignature));
}
