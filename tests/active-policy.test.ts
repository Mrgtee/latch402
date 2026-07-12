import { describe, expect, it } from "vitest";

import { type AppConfig } from "../src/config.js";
import { OKX_SUPPORTED_ASSETS, OKX_X_LAYER_TESTNET } from "../src/domain/constants.js";
import {
  evaluateActiveGates,
  evaluateSpendPolicy,
  estimateRequirementUsd,
} from "../src/scanner/activePolicy.js";

const baseConfig = {
  nodeEnv: "test" as const,
  port: 4020,
  corsOrigin: "*",
  dbPath: ":memory:",
  publicBaseUrl: undefined,
  paymentMode: "off" as const,
  okxPaymentEnabled: false,
  targetAllowlist: undefined,
  scanTimeoutMs: 100,
  scanMaxBodyBytes: 1024,
  activePaymentsEnabled: true,
  scanSpendCapUsd: 0.1,
  evmPrivateKey: "0x" + "1".repeat(64),
  activeNetwork: OKX_X_LAYER_TESTNET,
  x402Network: OKX_X_LAYER_TESTNET,
  x402PriceUsd: "0.05",
  payToAddress: undefined,
  okxApiKey: undefined,
  okxSecretKey: undefined,
  okxPassphrase: undefined,
  okxFacilitatorBaseUrl: undefined,
  okxSyncSettle: false,
  xLayerRpcUrl: undefined,
  version: "0.1.0",
} satisfies AppConfig;

describe("active payment policy", () => {
  it("fails closed when active env gates are missing", () => {
    const result = evaluateActiveGates(
      {
        targetUrl: "https://example.com/paid",
        method: "GET",
        headers: {},
        mode: "active",
        authorizationConfirmed: true,
      },
      { ...baseConfig, activePaymentsEnabled: false, evmPrivateKey: undefined, scanSpendCapUsd: 0 },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons).toContain("SCAN_ACTIVE_PAYMENTS_ENABLED is not true");
      expect(result.reasons).toContain("EVM_PRIVATE_KEY is missing or invalid");
    }
  });

  it("estimates stablecoin atomic amounts as USD", () => {
    expect(estimateRequirementUsd({ amount: "50000" })).toBe(0.05);
    expect(estimateRequirementUsd({ price: "$0.07" })).toBe(0.07);
  });

  it("enforces network asset and cap before spending", () => {
    const allowed = evaluateSpendPolicy(
      { network: OKX_X_LAYER_TESTNET, asset: OKX_SUPPORTED_ASSETS.USDG, amount: "50000" },
      baseConfig,
    );
    expect(allowed.ok).toBe(true);

    const tooExpensive = evaluateSpendPolicy(
      { network: OKX_X_LAYER_TESTNET, asset: OKX_SUPPORTED_ASSETS.USDG, amount: "200000" },
      baseConfig,
    );
    expect(tooExpensive.ok).toBe(false);
  });
});
