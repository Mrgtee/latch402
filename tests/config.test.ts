import { afterEach, describe, expect, it } from "vitest";

import { getConfig } from "../src/config.js";

const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

describe("config", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("treats empty optional env vars as unset", () => {
    Object.assign(process.env, {
      NODE_ENV: "production",
      LATCH402_PAYMENT_MODE: "auto",
      LATCH402_PUBLIC_BASE_URL: "",
      TARGET_ALLOWLIST: "",
      EVM_PRIVATE_KEY: "",
      PAY_TO_ADDRESS: "",
      OKX_API_KEY: "",
      OKX_SECRET_KEY: "",
      OKX_PASSPHRASE: "",
      OKX_FACILITATOR_BASE_URL: "",
      X_LAYER_RPC_URL: "",
    });

    const config = getConfig();

    expect(config.publicBaseUrl).toBeUndefined();
    expect(config.targetAllowlist).toBeUndefined();
    expect(config.evmPrivateKey).toBeUndefined();
    expect(config.payToAddress).toBeUndefined();
    expect(config.okxFacilitatorBaseUrl).toBeUndefined();
    expect(config.xLayerRpcUrl).toBeUndefined();
  });
});
