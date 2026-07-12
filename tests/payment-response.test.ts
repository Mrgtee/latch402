import { describe, expect, it } from "vitest";

import { extractSettlementTxHash } from "../src/x402/paymentResponse.js";

describe("payment response helpers", () => {
  it("extracts transaction hashes from common settlement shapes", () => {
    const txHash = `0x${"a".repeat(64)}` as const;

    expect(extractSettlementTxHash({ transaction: txHash })).toBe(txHash);
    expect(extractSettlementTxHash({ settlement: { txHash } })).toBe(txHash);
    expect(
      extractSettlementTxHash({ extensions: [{ receipt: { transactionHash: txHash } }] }),
    ).toBe(txHash);
  });

  it("returns undefined when no transaction hash is present", () => {
    expect(extractSettlementTxHash({ success: true, transaction: "pending" })).toBeUndefined();
  });
});
