import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("createApp", () => {
  it("builds an express app", () => {
    const app = createApp();
    expect(app).toBeDefined();
  });

  it("trusts the first deployment proxy for canonical HTTPS resource URLs", () => {
    const app = createApp();

    expect(app.get("trust proxy")).toBe(1);
  });
});
