import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("createApp", () => {
  it("builds an express app", () => {
    const app = createApp();
    expect(app).toBeDefined();
  });
});

