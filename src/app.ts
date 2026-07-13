import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { nanoid } from "nanoid";
import { pinoHttp } from "pino-http";
import { ZodError } from "zod";

import { getConfig } from "./config.js";
import { logger } from "./logger.js";
import { createOkxPaymentGate } from "./payment/okx.js";
import { createRateLimiter } from "./security/rateLimit.js";
import { runActiveScan } from "./scanner/active.js";
import { runPassiveScan } from "./scanner/passive.js";
import { getReportStore } from "./store/reportStore.js";

function hostForAudit(targetUrl: string): string {
  try {
    return new URL(targetUrl).hostname;
  } catch {
    return "invalid-url";
  }
}

export function createApp(): Express {
  const config = getConfig();
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
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
        "/openapi.json": { get: { responses: { "200": { description: "OpenAPI schema" } } } },
        "/api/v1/scan": {
          post: {
            summary: "Run a paid x402 security scan",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ScanRequest" },
                },
              },
            },
            responses: {
              "200": { description: "Scan report" },
              "402": { description: "Payment required in production" },
            },
          },
        },
        "/api/v1/reports/{runId}": {
          get: {
            summary: "Fetch a stored report with its report token",
            parameters: [
              { name: "runId", in: "path", required: true, schema: { type: "string" } },
              { name: "token", in: "query", required: true, schema: { type: "string" } },
            ],
            responses: {
              "200": { description: "Stored scan report" },
              "401": { description: "Missing token" },
              "404": { description: "Report not found" },
            },
          },
        },
      },
      components: {
        schemas: {
          ScanRequest: {
            type: "object",
            required: ["targetUrl", "mode", "authorizationConfirmed"],
            properties: {
              targetUrl: { type: "string", format: "uri" },
              method: { type: "string", enum: ["GET", "POST"], default: "GET" },
              headers: { type: "object", additionalProperties: { type: "string" } },
              body: {},
              mode: { type: "string", enum: ["passive", "active"] },
              expectedNetwork: { type: "string", enum: ["eip155:196", "eip155:1952"] },
              expectedAssets: { type: "array", items: { type: "string" } },
              authorizationConfirmed: { type: "boolean", const: true },
            },
          },
          ScanReport: {
            type: "object",
            required: ["runId", "targetUrl", "score", "verdict", "findings", "evidence"],
            properties: {
              runId: { type: "string" },
              targetUrl: { type: "string" },
              score: { type: "integer", minimum: 0, maximum: 100 },
              verdict: { type: "string", enum: ["pass", "warn", "fail"] },
              findings: { type: "array" },
              evidence: { type: "array" },
            },
          },
        },
      },
    });
  });

  app.use(
    "/api/v1/scan",
    createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }),
  );

  const okxPaymentGate = createOkxPaymentGate(config);
  if (okxPaymentGate) {
    app.use(okxPaymentGate);
  }

  app.post("/api/v1/scan", async (req, res, next) => {
    try {
      const report =
        req.body?.mode === "active"
          ? await runActiveScan(req.body, config)
          : await runPassiveScan(req.body, config);
      const reportWithToken = { ...report, reportToken: nanoid(32) };
      getReportStore(config.dbPath).save(reportWithToken);
      logger.info(
        {
          scan: {
            runId: reportWithToken.runId,
            mode: reportWithToken.mode,
            method: reportWithToken.method,
            targetHost: hostForAudit(reportWithToken.targetUrl),
            verdict: reportWithToken.verdict,
            score: reportWithToken.score,
            findingCount: reportWithToken.findings.length,
            okxPaymentEnabled: config.okxPaymentEnabled,
          },
        },
        "scan completed",
      );
      res.json(reportWithToken);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/reports/:runId", (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : undefined;
    if (!token) {
      res.status(401).json({ error: "missing_report_token" });
      return;
    }

    const report = getReportStore(config.dbPath).get(req.params.runId, token);
    if (!report) {
      res.status(404).json({ error: "report_not_found" });
      return;
    }

    res.json(report);
  });

  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      void _next;
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "invalid_scan_request",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }

      logger.error({ err: error }, "request failed");
      res.status(500).json({ error: "internal_error" });
    },
  );

  return app;
}
