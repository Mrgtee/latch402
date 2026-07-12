import { type AppConfig } from "../config.js";
import { type Evidence, type Finding, type ScanRequest } from "../domain/schemas.js";
import { evidenceId } from "./evidence.js";
import { probeTarget } from "./httpClient.js";

export type RedTeamResult = {
  evidence: Evidence[];
  findings: Finding[];
};

function finding(
  category: Finding["category"],
  severity: Finding["severity"],
  title: string,
  description: string,
  evidenceIds: string[],
  remediation: string[],
): Finding {
  return {
    id: evidenceId("finding"),
    category,
    severity,
    title,
    description,
    evidenceIds,
    remediation,
  };
}

function substituteResource(targetUrl: string): string | undefined {
  try {
    const url = new URL(targetUrl);
    const suffix = url.pathname.endsWith("/")
      ? "latch402-resource-binding-probe"
      : "/latch402-resource-binding-probe";
    url.pathname = `${url.pathname}${suffix}`;
    url.searchParams.set("latch402_probe", "resource-substitution");
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function runPaidRedTeamChecks(
  request: ScanRequest,
  config: AppConfig,
  paymentHeaders: Record<string, string>,
): Promise<RedTeamResult> {
  const evidence: Evidence[] = [];
  const findings: Finding[] = [];

  try {
    const replay = await probeTarget(
      request,
      config,
      paymentHeaders,
      "Replay same PAYMENT-SIGNATURE probe",
    );
    evidence.push(replay.evidence);
    if (replay.status >= 200 && replay.status < 300) {
      findings.push(
        finding(
          "IDEMPOTENCY_REPLAY_RISK",
          "high",
          "Same payment signature replay returned paid content",
          `Replaying the same PAYMENT-SIGNATURE returned HTTP ${replay.status}.`,
          [replay.evidence.id],
          [
            "Bind payment authorizations to a nonce/idempotency key and reject reused payment signatures after first settlement.",
          ],
        ),
      );
    }
  } catch (error) {
    // Network failures are preserved as absence of replay evidence, not as a fabricated finding.
    void error;
  }

  const substitutedUrl = substituteResource(request.targetUrl);
  if (substitutedUrl) {
    try {
      const substitutedRequest: ScanRequest = { ...request, targetUrl: substitutedUrl };
      const substitution = await probeTarget(
        substitutedRequest,
        config,
        paymentHeaders,
        "Resource substitution with same PAYMENT-SIGNATURE probe",
      );
      evidence.push(substitution.evidence);
      if (substitution.status >= 200 && substitution.status < 300) {
        findings.push(
          finding(
            "RESOURCE_BINDING_MISSING",
            "critical",
            "Same payment signature worked on a substituted resource",
            `A payment for the original resource returned HTTP ${substitution.status} on ${substitutedUrl}.`,
            [substitution.evidence.id],
            [
              "Include canonical resource and method in the payment requirement and verify them before granting access.",
            ],
          ),
        );
      }
    } catch (error) {
      void error;
    }
  }

  try {
    const cacheLeak = await probeTarget(
      request,
      config,
      {},
      "Post-payment unpaid cache-leak probe",
    );
    evidence.push(cacheLeak.evidence);
    if (cacheLeak.status >= 200 && cacheLeak.status < 300) {
      findings.push(
        finding(
          "CACHE_LEAKAGE_RISK",
          "critical",
          "Unpaid request returned paid content after a paid replay",
          `After a paid replay, a request without PAYMENT-SIGNATURE returned HTTP ${cacheLeak.status}.`,
          [cacheLeak.evidence.id],
          [
            "Set Cache-Control: no-store on paid responses and ensure CDN/cache keys vary on payment authorization state.",
          ],
        ),
      );
    }
  } catch (error) {
    void error;
  }

  return { evidence, findings };
}
