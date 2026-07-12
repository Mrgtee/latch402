import { describe, expect, it } from "vitest";

import { getConfig } from "../src/config.js";
import { runPassiveScan } from "../src/scanner/passive.js";
import { findPii } from "../src/scanner/pii.js";
import { isPrivateAddress } from "../src/security/ssrf.js";

describe("SSRF guard", () => {
  it("detects private and public IP address classes", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.0.0.5")).toBe(true);
    expect(isPrivateAddress("192.168.1.20")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("rejects non-HTTPS targets before network probing", async () => {
    const report = await runPassiveScan(
      {
        targetUrl: "http://example.com/paid",
        mode: "passive",
        authorizationConfirmed: true,
      },
      getConfig(),
    );

    expect(report.findings[0]?.category).toBe("HTTPS_OR_PUBLIC_ENDPOINT_INVALID");
    expect(report.evidence[0]?.summary).toContain("rejected");
  });
});

describe("PII detector", () => {
  it("flags PII-like keys and values in payment metadata", () => {
    const hits = findPii({ payerEmail: "alice@example.com", nested: { phone: "+1 415 555 0100" } });

    expect(hits.map((hit) => hit.rule)).toContain("pii-like key");
    expect(hits.some((hit) => hit.rule === "email-like value")).toBe(true);
    expect(hits.some((hit) => hit.rule === "phone-like value")).toBe(true);
  });
});
