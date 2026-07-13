import { describe, expect, it } from "vitest";

import { getConfig } from "../../src/config.js";
import { runPassiveScan } from "../../src/scanner/passive.js";

const targetUrl = process.env.OKX_REFERENCE_X402_TARGET_URL ?? process.env.PASSIVE_TEST_TARGET_URL;
const maybeDescribe = targetUrl ? describe : describe.skip;

maybeDescribe("live passive x402 integration", () => {
  it("scans a configured live endpoint without spending funds", async () => {
    const report = await runPassiveScan(
      {
        targetUrl,
        mode: "passive",
        authorizationConfirmed: true,
        expectedNetwork: process.env.PASSIVE_TEST_EXPECTED_NETWORK as
          "eip155:196" | "eip155:1952" | undefined,
      },
      getConfig(),
    );

    expect(report.runId).toBeTruthy();
    expect(report.evidence.some((item) => item.kind === "http")).toBe(true);
    if (process.env.PASSIVE_TEST_EXPECT_OKX_READY === "true") {
      expect(report.okxReadiness.pass).toBe(true);
    }
  }, 30000);
});
