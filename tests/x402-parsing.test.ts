import { describe, expect, it } from "vitest";

import { OKX_SUPPORTED_ASSETS, OKX_X_LAYER_MAINNET } from "../src/domain/constants.js";
import { getChallengeRequirements } from "../src/domain/schemas.js";
import { decodeBase64JsonHeader, encodeBase64UrlJson } from "../src/x402/base64.js";
import { normalizeHeaderMap, parsePaymentRequired } from "../src/x402/headers.js";
import {
  hasOkxCompatibleRequirement,
  hasResourceBinding,
  isCaip2Network,
  isOkxSupportedAsset,
  isOkxSupportedNetwork,
} from "../src/x402/validators.js";

const challenge = {
  x402Version: 2,
  accepts: [
    {
      scheme: "exact",
      network: OKX_X_LAYER_MAINNET,
      asset: OKX_SUPPORTED_ASSETS.USDG,
      maxAmountRequired: "50000",
      payTo: "0x1111111111111111111111111111111111111111",
      resource: "https://api.example.com/paid?b=2&a=1",
      extra: { method: "POST" },
    },
  ],
};

const okxTopLevelResourceChallenge = {
  x402Version: 2,
  resource: {
    url: "https://api.example.com/paid",
    description: "paid endpoint",
    mimeType: "application/json",
  },
  accepts: [
    {
      scheme: "exact",
      network: OKX_X_LAYER_MAINNET,
      asset: OKX_SUPPORTED_ASSETS.USDG,
      amount: "50000",
      payTo: "0x1111111111111111111111111111111111111111",
    },
  ],
};

describe("x402 header decoding", () => {
  it("decodes base64url JSON headers", () => {
    const encoded = encodeBase64UrlJson(challenge);
    const decoded = decodeBase64JsonHeader(encoded);

    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.sourceEncoding).toBe("base64url");
      expect(decoded.data).toMatchObject({ x402Version: 2 });
    }
  });

  it("returns structured errors for invalid base64 JSON", () => {
    const decoded = decodeBase64JsonHeader("bm90LWpzb24=");

    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.error).toContain("decoded value is not JSON");
    }
  });

  it("parses PAYMENT-REQUIRED from headers", () => {
    const parsed = parsePaymentRequired(
      normalizeHeaderMap({ "PAYMENT-REQUIRED": encodeBase64UrlJson(challenge) }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(getChallengeRequirements(parsed.value)).toHaveLength(1);
      expect(hasOkxCompatibleRequirement(parsed.value)).toBe(true);
    }
  });

  it("parses x402 JSON body when header is missing", () => {
    const parsed = parsePaymentRequired({}, JSON.stringify(challenge));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.source).toBe("body");
    }
  });
});

describe("x402 validators", () => {
  it("validates CAIP-2 and OKX network identifiers", () => {
    expect(isCaip2Network("eip155:196")).toBe(true);
    expect(isCaip2Network("bad network")).toBe(false);
    expect(isOkxSupportedNetwork("eip155:196")).toBe(true);
    expect(isOkxSupportedNetwork("eip155:1")).toBe(false);
  });

  it("validates supported X Layer payment assets", () => {
    expect(isOkxSupportedAsset(OKX_SUPPORTED_ASSETS.USDG.toUpperCase())).toBe(true);
    expect(isOkxSupportedAsset("0x0000000000000000000000000000000000000000")).toBe(false);
  });

  it("requires canonical resource and method binding", () => {
    const parsed = parsePaymentRequired({}, JSON.stringify(challenge));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(hasResourceBinding(parsed.value, "https://api.example.com/paid?b=2&a=1", "POST")).toBe(
        true,
      );
      expect(hasResourceBinding(parsed.value, "https://api.example.com/other", "POST")).toBe(false);
      expect(hasResourceBinding(parsed.value, "https://api.example.com/paid?b=2&a=1", "GET")).toBe(
        false,
      );
    }
  });

  it("accepts OKX top-level resource URL binding", () => {
    const parsed = parsePaymentRequired({}, JSON.stringify(okxTopLevelResourceChallenge));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(hasResourceBinding(parsed.value, "https://api.example.com/paid", "POST")).toBe(true);
      expect(hasResourceBinding(parsed.value, "https://api.example.com/other", "POST")).toBe(false);
    }
  });
});
