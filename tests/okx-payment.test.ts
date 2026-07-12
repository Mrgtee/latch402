import { describe, expect, it } from "vitest";

import { type AppConfig } from "../src/config.js";
import { OKX_X_LAYER_MAINNET, OKX_X_LAYER_TESTNET } from "../src/domain/constants.js";
import { validateOkxPaymentConfig } from "../src/payment/okx.js";

const baseConfig: AppConfig = {
  nodeEnv: "production",
  port: 4020,
  corsOrigin: "*",
  dbPath: ":memory:",
  publicBaseUrl: "https://latch402.example.com",
  paymentMode: "okx",
  okxPaymentEnabled: true,
  targetAllowlist: undefined,
  scanTimeoutMs: 12000,
  scanMaxBodyBytes: 65536,
  activePaymentsEnabled: false,
  scanSpendCapUsd: 0,
  evmPrivateKey: undefined,
  activeNetwork: OKX_X_LAYER_TESTNET,
  x402Network: OKX_X_LAYER_MAINNET,
  x402PriceUsd: "0.05",
  payToAddress: "0x1111111111111111111111111111111111111111",
  okxApiKey: "key",
  okxSecretKey: "secret",
  okxPassphrase: "passphrase",
  okxFacilitatorBaseUrl: undefined,
  okxSyncSettle: false,
  xLayerRpcUrl: undefined,
  version: "0.1.0",
};

describe("OKX payment config", () => {
  it("accepts complete production payment config", () => {
    expect(validateOkxPaymentConfig(baseConfig)).toEqual({ ok: true, price: "$0.05" });
  });

  it("fails fast when required OKX payment config is missing", () => {
    const result = validateOkxPaymentConfig({
      ...baseConfig,
      payToAddress: undefined,
      okxApiKey: undefined,
      x402PriceUsd: "0",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("PAY_TO_ADDRESS");
      expect(result.missing).toContain("OKX_API_KEY");
      expect(result.missing).toContain("X402_PRICE_USD");
    }
  });
});
