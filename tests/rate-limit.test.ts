import { describe, expect, it } from "vitest";

import { MemoryRateLimiter } from "../src/security/rateLimit.js";

describe("MemoryRateLimiter", () => {
  it("limits requests per key within the configured window", () => {
    const limiter = new MemoryRateLimiter({ windowMs: 1000, max: 2 });

    expect(limiter.take("ip", 0).allowed).toBe(true);
    expect(limiter.take("ip", 10).allowed).toBe(true);
    expect(limiter.take("ip", 20).allowed).toBe(false);
    expect(limiter.take("ip", 1001).allowed).toBe(true);
  });
});
