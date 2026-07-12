import { type Evidence, type Finding, type ScanReport } from "../domain/schemas.js";
import { remediationSnippetsByCategory } from "./remediation.js";

const severityRank: Record<Finding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function escapeCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const severity = severityRank[a.severity] - severityRank[b.severity];
    if (severity !== 0) return severity;
    return a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
  });
}

function findingsTable(findings: Finding[]): string {
  if (findings.length === 0) return "No findings recorded.";
  return [
    "| Severity | Category | Finding | Evidence |",
    "| --- | --- | --- | --- |",
    ...findings.map(
      (finding) =>
        `| ${escapeCell(finding.severity)} | ${escapeCell(finding.category)} | ${escapeCell(finding.title)} | ${escapeCell(finding.evidenceIds.join(", "))} |`,
    ),
  ].join("\n");
}

function evidenceTable(evidence: Evidence[]): string {
  if (evidence.length === 0) return "No evidence recorded.";
  return [
    "| ID | Kind | Summary | Status |",
    "| --- | --- | --- | --- |",
    ...evidence.map(
      (item) =>
        `| ${escapeCell(item.id)} | ${escapeCell(item.kind)} | ${escapeCell(item.summary)} | ${escapeCell(item.response?.status ?? "")} |`,
    ),
  ].join("\n");
}

function snippetsSection(report: ScanReport): string {
  const snippets = remediationSnippetsByCategory(report.findings);
  const lines: string[] = [];
  for (const [category, items] of Object.entries(snippets)) {
    if (items.length === 0) continue;
    lines.push(`### ${category}`);
    lines.push(...items.map((item) => `- ${item}`));
  }
  return lines.length > 0 ? lines.join("\n") : "No category-specific snippets needed.";
}

export function renderMarkdownReport(report: ScanReport): string {
  const readiness = report.okxReadiness.pass
    ? "Pass"
    : `Missing: ${report.okxReadiness.missing.join(", ") || "unknown"}`;

  return [
    `# latch402 Scan Report`,
    "",
    `- Run ID: ${report.runId}`,
    `- Target: ${report.method} ${report.targetUrl}`,
    `- Mode: ${report.mode}`,
    `- Score: ${report.score}/100`,
    `- Verdict: ${report.verdict}`,
    `- OKX readiness: ${readiness}`,
    `- Created: ${report.createdAt}`,
    "",
    "## Findings",
    findingsTable(sortFindings(report.findings)),
    "",
    "## Evidence",
    evidenceTable(report.evidence),
    "",
    "## Remediation",
    report.remediation.length > 0
      ? report.remediation.map((item) => `- ${item}`).join("\n")
      : "No remediation required.",
    "",
    "## Remediation Snippets",
    snippetsSection(report),
    "",
    "## Evidence Rule",
    "latch402 reports only observed HTTP, x402, policy, and optional RPC evidence. It does not invent active payment or settlement results.",
  ].join("\n");
}
