import { createPublicClient, defineChain, http } from "viem";

import { type AppConfig } from "../config.js";
import { type Evidence, type Finding } from "../domain/schemas.js";
import { extractSettlementTxHash } from "../x402/paymentResponse.js";
import { evidenceId, makeScannerEvidence } from "./evidence.js";

export type SettlementCheckResult = {
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

function chainIdFromNetwork(network: string): number {
  const [, id] = network.split(":");
  return Number(id);
}

export async function checkSettlementReceipt(
  settlement: unknown,
  config: AppConfig,
): Promise<SettlementCheckResult> {
  const evidence: Evidence[] = [];
  const findings: Finding[] = [];
  const txHash = extractSettlementTxHash(settlement);

  if (!txHash) {
    const ev = makeScannerEvidence("PAYMENT-RESPONSE did not include a transaction hash", {
      settlement,
    });
    evidence.push(ev);
    findings.push(
      finding(
        "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
        "medium",
        "Settlement transaction hash is unavailable",
        "The paid response included settlement metadata, but no transaction hash could be extracted for on-chain verification.",
        [ev.id],
        [
          "Include a transaction hash in PAYMENT-RESPONSE so clients and scanners can verify settlement on X Layer.",
        ],
      ),
    );
    return { evidence, findings };
  }

  if (!config.xLayerRpcUrl) {
    evidence.push(
      makeScannerEvidence("Settlement transaction hash found; RPC lookup not configured", {
        txHash,
        network: config.activeNetwork,
      }),
    );
    return { evidence, findings };
  }

  try {
    const chainId = chainIdFromNetwork(config.activeNetwork);
    const chain = defineChain({
      id: chainId,
      name: `X Layer ${chainId}`,
      nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
      rpcUrls: { default: { http: [config.xLayerRpcUrl] } },
    });
    const client = createPublicClient({ chain, transport: http(config.xLayerRpcUrl) });
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    evidence.push(
      makeScannerEvidence("Verified settlement transaction receipt on X Layer RPC", {
        txHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      }),
    );
    if (receipt.status !== "success") {
      const ev = evidence[evidence.length - 1];
      findings.push(
        finding(
          "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
          "high",
          "Settlement transaction did not succeed",
          `X Layer receipt status was ${receipt.status}.`,
          ev ? [ev.id] : [],
          [
            "Grant paid content only after successful settlement or expose pending status until settlement completes.",
          ],
        ),
      );
    }
  } catch (error) {
    const ev = makeScannerEvidence("Settlement RPC lookup failed", {
      txHash,
      error: (error as Error).message,
    });
    evidence.push(ev);
    findings.push(
      finding(
        "SETTLEMENT_BEFORE_GRANT_UNKNOWN_OR_UNSAFE",
        "medium",
        "Settlement receipt could not be verified",
        (error as Error).message,
        [ev.id],
        [
          "Provide a reliable X Layer RPC URL for verification and return transaction hashes in PAYMENT-RESPONSE.",
        ],
      ),
    );
  }

  return { evidence, findings };
}
