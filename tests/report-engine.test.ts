import { describe, expect, it } from "vitest";

import { type ScanReport } from "../src/domain/schemas.js";
import { enrichReport } from "../src/report/reportEngine.js";

const baseReport: ScanReport = {
  runId: "run_1",
  targetUrl: "https://api.example.com/paid",
  method: "GET",
  mode: "passive",
  score: 100,
  verdict: "pass",
  findings: [
    {
      id: "f_low",
      category: "CACHE_LEAKAGE_RISK",
      severity: "low",
      title: "Cache policy missing",
      description: "No no-store header.",
      evidenceIds: ["e1"],
      remediation: ["Set Cache-Control: no-store."],
    },
    {
      id: "f_high",
      category: "RESOURCE_BINDING_MISSING",
      severity: "high",
      title: "Resource missing",
      description: "No resource field.",
      evidenceIds: ["e2"],
      remediation: [],
    },
  ],
  evidence: [{ id: "e1", kind: "http", summary: "Probe", timestamp: "2026-07-12T00:00:00.000Z" }],
  okxReadiness: { pass: false, missing: ["resource-bound payment requirement"] },
  remediation: [],
  createdAt: "2026-07-12T00:00:00.000Z",
};

describe("report engine", () => {
  it("sorts findings, scores deterministically, and renders markdown", () => {
    const report = enrichReport(baseReport);

    expect(report.score).toBe(75);
    expect(report.verdict).toBe("warn");
    expect(report.findings[0]?.severity).toBe("high");
    expect(report.remediation.some((item) => item.includes("canonical URL"))).toBe(true);
    expect(report.markdown).toContain("# latch402 Scan Report");
    expect(report.markdown).toContain("## Evidence");
  });
});
