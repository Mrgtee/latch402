import { type RequestHandler } from "express";

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly options: RateLimitOptions) {}

  take(
    key: string,
    now = Date.now(),
  ): { allowed: true; remaining: number; resetAt: number } | { allowed: false; resetAt: number } {
    const existing = this.buckets.get(key);
    const bucket =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + this.options.windowMs }
        : existing;

    bucket.count += 1;
    this.buckets.set(key, bucket);

    if (bucket.count > this.options.max) {
      return { allowed: false, resetAt: bucket.resetAt };
    }

    return { allowed: true, remaining: this.options.max - bucket.count, resetAt: bucket.resetAt };
  }

  prune(now = Date.now()): void {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

function clientKey(req: Parameters<RequestHandler>[0]): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const limiter = new MemoryRateLimiter(options);
  let lastPrune = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastPrune > options.windowMs) {
      limiter.prune(now);
      lastPrune = now;
    }

    const result = limiter.take(clientKey(req), now);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    res.setHeader("RateLimit-Remaining", String(result.remaining));
    next();
  };
}
