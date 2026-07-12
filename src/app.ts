import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { getConfig } from "./config.js";
import { logger } from "./logger.js";

export function createApp(): Express {
  const config = getConfig();
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "256kb" }));
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "latch402",
      version: config.version,
    });
  });

  app.get("/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.1.0",
      info: {
        title: "latch402 x402 Red-Team Scanner",
        version: config.version,
      },
      paths: {
        "/health": { get: { responses: { "200": { description: "Healthy" } } } },
        "/api/v1/scan": { post: { responses: { "200": { description: "Scan report" } } } },
      },
    });
  });

  return app;
}

