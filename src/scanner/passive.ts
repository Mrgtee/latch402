import { randomUUID } from "node:crypto";

import { type AppConfig } from "../config.js";
import {
  type Finding,
  type ScanReport,
  type ScanRequest,
  scanRequestSchema,
} from "../domain/schemas.js";
import { enrichReport } from "../report/reportEngine.js";
import { scoreFindings, uniqueRemediation, verdictForScore } from "../report/scoring.js";
import { assertPublicHttpsUrl } from "../security/ssrf.js";
import { parsePaymentRequired } from "../x402/headers.js";
import {
  challengeAssets,
  challengeNetworks,
  challengeVersionIsV2,
  hasExpectedAsset,
  hasExpectedNetwork,
  hasOkxCompatibleRequirement,
  hasResourceBinding,
} from "../x402/validators.js";
import { evidenceId, isoNow, makeScannerEvidence } from "./evidence.js";
import { findPii } from "./pii.js";
import { probeTarget, type HttpProbeResult } from "./httpClient.js";

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

function cacheLooksUnsafe(headers: Record<string, string>): boolean {
  const cacheControl = headers["cache-control"]?.toLowerCase();
  if (!cacheControl) return true;
  return (
    cacheControl.includes("public") ||
    cacheControl.includes("s-maxage") ||
    !/(no-store|private)/.test(cacheControl)
  );
}

function okxMissing(findings: Finding[], status: number): string[] {
  const missing = new Set<string>();
  if (status !== 402) missing.add("unpaid request must return HTTP 402");
  for (const item of findings) {
    if (item.category === "X402_CHALLENGE_INVALID") missing.add("valid x402 V2 challenge");
    if (item.category === "OKX_NETWORK_OR_ASSET_MISMATCH")
      missing.add("X Layer network and supported asset");
    if (item.category === "RESOURCE_BINDING_MISSING")
      missing.add("resource-bound payment requirement");
    if (item.category === "PAYMENT_HEADER_VERSION_MISMATCH")
      missing.add("x402 V2 header/body consistency");
  }
  return [...missing];
}

async function malformedPaymentProbe(
  request: ScanRequest,
  config: AppConfig,
): Promise<HttpProbeResult | undefined> {
  try {
    return await probeTarget(
      request,
      config,
      { "PAYMENT-SIGNATURE": "latch402.invalid-signature" },
      "Malformed PAYMENT-SIGNATURE rejection probe",
    );
  } catch {
    return undefined;
  }
}

export async function runPassiveScan(input: unknown, config: AppConfig): Promise<ScanReport> {
  const request = scanRequestSchema.parse(input);
  const runId = randomUUID();
  const evidence = [];
  const findings: Finding[] = [];

  const publicTarget = await assertPublicHttpsUrl(request.targetUrl, config.targetAllowlist);
  if (!publicTarget.ok) {
    const ev = makeScannerEvidence("Target URL rejected before probing", {
      reason: publicTarget.reason,
      addresses: publicTarget.addresses,
    });
    evidence.push(ev);
    findings.push(
      finding(
        "HTTPS_OR_PUBLIC_ENDPOINT_INVALID",
        "high",
        "Target is not a public HTTPS endpoint",
        publicTarget.reason,
        [ev.id],
        [
          "Expose the paid endpoint over public HTTPS and avoid private, loopback, or link-local destinations.",
        ],
      ),
    );
    const score = scoreFindings(findings);
    return enrichReport({
      runId,
      targetUrl: request.targetUrl,
      method: request.method,
      mode: request.mode,
      score,
      verdict: verdictForScore(score),
      findings,
      evidence,
      okxReadiness: { pass: false, missing: okxMissing(findings, 0) },
      remediation: uniqueRemediation(findings),
      createdAt: isoNow(),
    });
  }

  evidence.push(
    makeScannerEvidence("Target DNS resolved to public addresses", {
      addresses: publicTarget.addresses,
    }),
  );

  let unpaidProbe: HttpProbeResult;
  try {
    unpaidProbe = await probeTarget(request, config, {}, "Unpaid x402 challenge probe");
    evidence.push(unpaidProbe.evidence);
  } catch (error) {
    const ev = makeScannerEvidence("Target probe failed", { error: (error as Error).message });
    evidence.push(ev);
    findings.push(
      finding(
        "HTTPS_OR_PUBLIC_ENDPOINT_INVALID",
        "high",
        "Target could not be reached",
        (error as Error).message,
        [ev.id],
        [
          "Make sure the endpoint is reachable from the public internet and completes within the scanner timeout.",
        ],
      ),
    );
    const score = scoreFindings(findings);
    return enrichReport({
      runId,
      targetUrl: request.targetUrl,
      method: request.method,
      mode: request.mode,
      score,
      verdict: verdictForScore(score),
      findings,
      evidence,
      okxReadiness: { pass: false, missing: okxMissing(findings, 0) },
      remediation: uniqueRemediation(findings),
      createdAt: isoNow(),
    });
  }

  if (unpaidProbe.status !== 402) {
    findings.push(
      finding(
        "X402_CHALLENGE_INVALID",
        unpaidProbe.status >= 200 && unpaidProbe.status < 300 ? "critical" : "high",
        "Unpaid request did not return HTTP 402",
        `Expected an x402 challenge, received HTTP ${unpaidProbe.status}.`,
        [unpaidProbe.evidence.id],
        [
          "Protect the paid endpoint with x402 middleware so unpaid requests return HTTP 402 Payment Required.",
        ],
      ),
    );
  }

  const parsedChallenge = parsePaymentRequired(unpaidProbe.headers, unpaidProbe.bodyText);
  if (!parsedChallenge.ok) {
    findings.push(
      finding(
        "X402_CHALLENGE_INVALID",
        "high",
        "x402 challenge metadata is missing or malformed",
        parsedChallenge.error,
        [unpaidProbe.evidence.id],
        ["Return a valid x402 V2 challenge in PAYMENT-REQUIRED or the documented JSON body."],
      ),
    );
  } else {
    const challengeEvidence = makeScannerEvidence("Parsed x402 challenge metadata", {
      source: parsedChallenge.source,
      sourceEncoding: parsedChallenge.decoded.sourceEncoding,
      networks: challengeNetworks(parsedChallenge.value),
      assets: challengeAssets(parsedChallenge.value),
    });
    evidence.push(challengeEvidence);

    if (!challengeVersionIsV2(parsedChallenge.value)) {
      findings.push(
        finding(
          "PAYMENT_HEADER_VERSION_MISMATCH",
          "medium",
          "Payment challenge is not clearly x402 V2",
          "The challenge did not declare x402Version 2.",
          [challengeEvidence.id],
          ["Emit x402 V2 challenge metadata consistently in headers and response bodies."],
        ),
      );
    }

    if (
      !hasOkxCompatibleRequirement(parsedChallenge.value) ||
      !hasExpectedNetwork(parsedChallenge.value, request.expectedNetwork) ||
      !hasExpectedAsset(parsedChallenge.value, request.expectedAssets)
    ) {
      findings.push(
        finding(
          "OKX_NETWORK_OR_ASSET_MISMATCH",
          "high",
          "Challenge does not advertise the expected OKX/X Layer payment terms",
          "No payment requirement matched the expected X Layer network and supported OKX assets.",
          [challengeEvidence.id],
          [
            "Advertise X Layer eip155:196 or eip155:1952 with supported USDG or USDt0 asset addresses.",
          ],
        ),
      );
    }

    if (!hasResourceBinding(parsedChallenge.value, request.targetUrl, request.method)) {
      findings.push(
        finding(
          "RESOURCE_BINDING_MISSING",
          "high",
          "Payment requirement is not bound to the requested resource",
          "The challenge did not contain a resource matching the target URL and method.",
          [challengeEvidence.id],
          ["Bind each payment requirement to the canonical protected URL and HTTP method."],
        ),
      );
    }

    const piiHits = findPii(parsedChallenge.value);
    if (piiHits.length > 0) {
      const piiEvidence = makeScannerEvidence("PII-like data found in x402 payment metadata", {
        hits: piiHits,
      });
      evidence.push(piiEvidence);
      findings.push(
        finding(
          "PAYMENT_METADATA_PII",
          "medium",
          "Payment metadata contains PII-like fields or values",
          "Payment challenges should not expose user-identifying data to clients, facilitators, or intermediaries.",
          [piiEvidence.id],
          [
            "Replace personal metadata with opaque IDs or hashes and keep user details on the application side.",
          ],
        ),
      );
    }
  }

  if (cacheLooksUnsafe(unpaidProbe.headers)) {
    findings.push(
      finding(
        "CACHE_LEAKAGE_RISK",
        "medium",
        "Payment challenge cache policy is unsafe or ambiguous",
        "The unpaid 402 response lacks a strict no-store/private cache policy or is explicitly cacheable.",
        [unpaidProbe.evidence.id],
        [
          "Set Cache-Control: no-store for payment challenges and paid responses unless a safer private policy is proven.",
        ],
      ),
    );
  }

  const malformedProbe = await malformedPaymentProbe(request, config);
  if (malformedProbe) {
    evidence.push(malformedProbe.evidence);
    if (malformedProbe.status >= 200 && malformedProbe.status < 300) {
      findings.push(
        finding(
          "PAYMENT_HEADER_VERSION_MISMATCH",
          "high",
          "Malformed payment signature was accepted",
          `A request with an invalid PAYMENT-SIGNATURE returned HTTP ${malformedProbe.status}.`,
          [malformedProbe.evidence.id],
          [
            "Reject malformed payment headers before executing paid work or returning paid content.",
          ],
        ),
      );
    }
  }

  const score = scoreFindings(findings);
  const missing = okxMissing(findings, unpaidProbe.status);
  return enrichReport({
    runId,
    targetUrl: request.targetUrl,
    method: request.method,
    mode: request.mode,
    score,
    verdict: verdictForScore(score),
    findings,
    evidence,
    okxReadiness: { pass: missing.length === 0, missing },
    remediation: uniqueRemediation(findings),
    createdAt: isoNow(),
  });
}
