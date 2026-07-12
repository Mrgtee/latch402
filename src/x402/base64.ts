export type DecodedJsonHeader =
  | {
      ok: true;
      raw: string;
      jsonText: string;
      data: unknown;
      sourceEncoding: "json" | "base64" | "base64url";
    }
  | { ok: false; raw: string; error: string };

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function withPadding(value: string): string {
  const remainder = value.length % 4;
  return remainder === 0 ? value : value + "=".repeat(4 - remainder);
}

export function decodeBase64JsonHeader(value: string | undefined | null): DecodedJsonHeader {
  const raw = value ?? "";
  const cleaned = stripWrappingQuotes(raw);

  if (!cleaned) {
    return { ok: false, raw, error: "header is empty" };
  }

  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    try {
      return {
        ok: true,
        raw,
        jsonText: cleaned,
        data: JSON.parse(cleaned),
        sourceEncoding: "json",
      };
    } catch (error) {
      return { ok: false, raw, error: `invalid JSON header: ${(error as Error).message}` };
    }
  }

  const isBase64Url = /[-_]/.test(cleaned) || !cleaned.endsWith("=");
  const normalized = withPadding(cleaned.replace(/-/g, "+").replace(/_/g, "/"));

  try {
    const jsonText = Buffer.from(normalized, "base64").toString("utf8");
    if (!jsonText.trim().startsWith("{") && !jsonText.trim().startsWith("[")) {
      return { ok: false, raw, error: "decoded value is not JSON" };
    }
    return {
      ok: true,
      raw,
      jsonText,
      data: JSON.parse(jsonText),
      sourceEncoding: isBase64Url ? "base64url" : "base64",
    };
  } catch (error) {
    return { ok: false, raw, error: `invalid base64 JSON header: ${(error as Error).message}` };
  }
}

export function encodeBase64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
