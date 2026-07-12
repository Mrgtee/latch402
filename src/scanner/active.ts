import { x402Client, x402HTTPClient, type PaymentPolicy } from "@okxweb3/x402-core/client";
import { type PaymentRequirements } from "@okxweb3/x402-core/types";
import { ExactEvmScheme, toClientEvmSigner } from "@okxweb3/x402-evm";
import { privateKeyToAccount } from "viem/accounts";

import { type AppConfig } from "../config.js";
import {
  type Evidence,
  type Finding,
  type ScanReport,
  scanRequestSchema,
} from "../domain/schemas.js";
import { scoreFindings, uniqueRemediation, verdictForScore } from "../report/scoring.js";
import { parsePaymentRequired, parsePaymentResponse } from "../x402/headers.js";
import { getChallengeRequirements } from "../domain/schemas.js";
import { evidenceId, makeScannerEvidence } from "./evidence.js";
import { evaluateActiveGates, evaluateSpendPolicy } from "./activePolicy.js";
import { probeTarget } from "./httpClient.js";
import { runPassiveScan } from "./passive.js";

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

function withAdditions(report: ScanReport, evidence: Evidence[], findings: Finding[]): ScanReport {
  const nextFindings = [...report.findings, ...findings];
  const score = scoreFindings(nextFindings);
  return {
    ...report,
    evidence: [...report.evidence, ...evidence],
    findings: nextFindings,
    score,
    verdict: verdictForScore(score),
    remediation: uniqueRemediation(nextFindings),
    okxReadiness: report.okxReadiness,
  };
}

function unpaidChallengeHeaders(report: ScanReport): Record<string, string> | undefined {
  const unpaid = report.evidence.find((item) => item.summary === "Unpaid x402 challenge probe");
  return unpaid?.response?.headers;
}

function policyForConfig(config: AppConfig): PaymentPolicy {
  return (_version: number, requirements: PaymentRequirements[]) =>
    requirements.filter((requirement) => evaluateSpendPolicy(requirement, config).ok);
}

export async function runActiveScan(input: unknown, config: AppConfig): Promise<ScanReport> {
  const request = scanRequestSchema.parse(input);
  const passiveReport = await runPassiveScan(request, config);
  const additions: Evidence[] = [];
  const activeFindings: Finding[] = [];

  const gates = evaluateActiveGates(request, config);
  if (!gates.ok) {
    const ev = makeScannerEvidence("Active payment probe was not attempted", {
      reasons: gates.reasons,
    });
    additions.push(ev);
    activeFindings.push(
      finding(
        "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
        "info",
        "Active payment evidence unavailable",
        `Active mode requires real payment configuration: ${gates.reasons.join("; ")}.`,
        [ev.id],
        [
          "Enable active scans only with a funded test wallet, explicit spend cap, and X Layer testnet before mainnet.",
        ],
      ),
    );
    return withAdditions(passiveReport, additions, activeFindings);
  }

  const headers = unpaidChallengeHeaders(passiveReport);
  if (!headers?.["payment-required"]) {
    const ev = makeScannerEvidence("Active payment probe could not extract PAYMENT-REQUIRED", {
      availableHeaders: Object.keys(headers ?? {}),
    });
    additions.push(ev);
    activeFindings.push(
      finding(
        "X402_CHALLENGE_INVALID",
        "high",
        "Active payment cannot proceed without PAYMENT-REQUIRED",
        "The OKX x402 client requires a PAYMENT-REQUIRED header to create a real payment payload.",
        [ev.id],
        ["Return a valid PAYMENT-REQUIRED header on unpaid 402 responses."],
      ),
    );
    return withAdditions(passiveReport, additions, activeFindings);
  }

  const parsedChallenge = parsePaymentRequired(headers);
  if (!parsedChallenge.ok) {
    const ev = makeScannerEvidence("Active payment probe could not parse challenge", {
      error: parsedChallenge.error,
    });
    additions.push(ev);
    activeFindings.push(
      finding(
        "X402_CHALLENGE_INVALID",
        "high",
        "Active payment cannot parse challenge",
        parsedChallenge.error,
        [ev.id],
        ["Return a valid x402 V2 payment challenge compatible with OKX client decoding."],
      ),
    );
    return withAdditions(passiveReport, additions, activeFindings);
  }

  const eligibleRequirement = getChallengeRequirements(parsedChallenge.value).find(
    (requirement) => evaluateSpendPolicy(requirement, config).ok,
  );
  if (!eligibleRequirement) {
    const decisions = getChallengeRequirements(parsedChallenge.value).map((requirement) => ({
      network: requirement.network,
      asset: requirement.asset,
      decision: evaluateSpendPolicy(requirement, config),
    }));
    const ev = makeScannerEvidence("No payment requirement passed active spend policy", {
      decisions,
    });
    additions.push(ev);
    activeFindings.push(
      finding(
        "OKX_NETWORK_OR_ASSET_MISMATCH",
        "medium",
        "No active payment option passed local policy",
        "The scanner refused to spend because no requirement matched the configured network, asset, and spend cap.",
        [ev.id],
        [
          "Use X Layer testnet/mainnet requirements with supported stablecoins and keep price below SCAN_SPEND_CAP_USD.",
        ],
      ),
    );
    return withAdditions(passiveReport, additions, activeFindings);
  }

  try {
    const account = privateKeyToAccount(config.evmPrivateKey as `0x${string}`);
    const signer = toClientEvmSigner(account);
    const coreClient = new x402Client().register(config.activeNetwork, new ExactEvmScheme(signer));
    coreClient.registerPolicy(policyForConfig(config));
    const httpClient = new x402HTTPClient(coreClient);

    const paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => headers[name.toLowerCase()],
    );
    const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
    const spendDecision = evaluateSpendPolicy(eligibleRequirement, config);

    additions.push(
      makeScannerEvidence("Created real OKX x402 payment payload", {
        network: eligibleRequirement.network,
        asset: eligibleRequirement.asset,
        estimatedUsd: spendDecision.ok ? spendDecision.estimatedUsd : undefined,
        resource: parsedChallenge.value.resource,
      }),
    );

    const paidProbe = await probeTarget(request, config, paymentHeaders, "Paid x402 replay probe");
    additions.push(paidProbe.evidence);

    const settlement = parsePaymentResponse(paidProbe.headers);
    if (settlement.ok) {
      additions.push(
        makeScannerEvidence("Parsed PAYMENT-RESPONSE settlement metadata", {
          source: settlement.source,
          settlement: settlement.value,
        }),
      );
    } else {
      activeFindings.push(
        finding(
          "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
          paidProbe.status >= 200 && paidProbe.status < 300 ? "medium" : "low",
          "Paid replay did not expose settlement metadata",
          settlement.error,
          [paidProbe.evidence.id],
          [
            "Return PAYMENT-RESPONSE after paid replay so clients can verify settlement status and transaction evidence.",
          ],
        ),
      );
    }

    if (paidProbe.status === 402) {
      activeFindings.push(
        finding(
          "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
          "high",
          "Real paid replay was still rejected",
          "The scanner created a real payment payload but the target still returned HTTP 402.",
          [paidProbe.evidence.id],
          [
            "Verify facilitator configuration, accepted asset, network, payTo address, and resource binding.",
          ],
        ),
      );
    }
  } catch (error) {
    const ev = makeScannerEvidence("Active payment probe failed before or during paid replay", {
      error: (error as Error).message,
    });
    additions.push(ev);
    activeFindings.push(
      finding(
        "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
        "medium",
        "Active payment probe failed",
        (error as Error).message,
        [ev.id],
        [
          "Run active scans first on X Layer testnet with a funded wallet and verify the target challenge matches the configured signer/network.",
        ],
      ),
    );
  }

  return withAdditions(passiveReport, additions, activeFindings);
}
