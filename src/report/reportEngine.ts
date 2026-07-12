import { type ScanReport } from "../domain/schemas.js";
import { renderMarkdownReport, sortFindings } from "./markdown.js";
import { remediationForFindings } from "./remediation.js";
import { scoreFindings, verdictForScore } from "./scoring.js";

export function enrichReport(report: ScanReport): ScanReport {
  const findings = sortFindings(report.findings);
  const score = scoreFindings(findings);
  const remediation = remediationForFindings(findings);
  const enriched = {
    ...report,
    findings,
    score,
    verdict: verdictForScore(score),
    remediation,
  } satisfies ScanReport;

  return {
    ...enriched,
    markdown: renderMarkdownReport(enriched),
  };
}
