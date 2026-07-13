import { createServer } from "node:http";

import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

async function withServer(
  app: ReturnType<typeof createApp>,
  fn: (baseUrl: string) => Promise<void>,
) {
  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test server did not expose a TCP address");
  }

  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

describe("createApp", () => {
  it("builds an express app", () => {
    const app = createApp();
    expect(app).toBeDefined();
  });

  it("trusts the first deployment proxy for canonical HTTPS resource URLs", () => {
    const app = createApp();

    expect(app.get("trust proxy")).toBe(1);
  });

  it("returns a clear method response for GET scan endpoint", async () => {
    const app = createApp();

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/scan`);
      const body = await response.json();

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
      expect(body).toEqual({
        error: "method_not_allowed",
        message: "Use POST /api/v1/scan to run a latch402 scan.",
        ui: "/",
        openapi: "/openapi.json",
      });
    });
  });

  it("serves the web UI at root", async () => {
    const app = createApp();

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(html).toContain("x402 endpoint preflight");
    });
  });
});
