import { type Finding } from "../domain/schemas.js";

const penalties = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
  info: 0,
} as const;

export function scoreFindings(findings: Finding[]): number {
  const penalty = findings.reduce((total, finding) => total + penalties[finding.severity], 0);
  return Math.max(0, 100 - penalty);
}

export function verdictForScore(score: number): "pass" | "warn" | "fail" {
  if (score < 60) return "fail";
  if (score < 90) return "warn";
  return "pass";
}

export function uniqueRemediation(findings: Finding[]): string[] {
  return [...new Set(findings.flatMap((finding) => finding.remediation))];
}
