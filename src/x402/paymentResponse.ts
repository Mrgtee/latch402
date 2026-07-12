const txHashPattern = /^0x[a-fA-F0-9]{64}$/;

function findTxHash(value: unknown, seen = new Set<unknown>()): string | undefined {
  if (typeof value === "string") {
    return txHashPattern.test(value) ? value : undefined;
  }

  if (!value || typeof value !== "object" || seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTxHash(item, seen);
      if (found) return found;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["txHash", "transaction", "transactionHash", "hash"]) {
    const found = findTxHash(record[key], seen);
    if (found) return found;
  }

  for (const nested of Object.values(record)) {
    const found = findTxHash(nested, seen);
    if (found) return found;
  }

  return undefined;
}

export function extractSettlementTxHash(value: unknown): `0x${string}` | undefined {
  const found = findTxHash(value);
  return found as `0x${string}` | undefined;
}
