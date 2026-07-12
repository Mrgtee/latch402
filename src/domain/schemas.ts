import { z } from "zod";

import { FINDING_CATEGORIES, OKX_SUPPORTED_NETWORKS, SEVERITIES } from "./constants.js";

export const scanModeSchema = z.enum(["passive", "active"]);
export const scanMethodSchema = z.enum(["GET", "POST"]);

export const scanRequestSchema = z
  .object({
    targetUrl: z.string().url(),
    method: scanMethodSchema.default("GET"),
    headers: z.record(z.string()).default({}),
    body: z.unknown().optional(),
    mode: scanModeSchema.default("passive"),
    expectedNetwork: z.enum(OKX_SUPPORTED_NETWORKS).optional(),
    expectedAssets: z.array(z.string().min(1)).optional(),
    authorizationConfirmed: z.literal(true),
  })
  .strict();

export type ScanRequest = z.infer<typeof scanRequestSchema>;
export type ScanMode = z.infer<typeof scanModeSchema>;
export type ScanMethod = z.infer<typeof scanMethodSchema>;

export const httpRequestEvidenceSchema = z.object({
  method: z.string(),
  url: z.string(),
  headers: z.record(z.string()).optional(),
  bodySha256: z.string().optional(),
});

export const httpResponseEvidenceSchema = z.object({
  status: z.number().int(),
  headers: z.record(z.string()),
  bodyPreview: z.string().optional(),
  bodySha256: z.string().optional(),
});

export const evidenceSchema = z.object({
  id: z.string(),
  kind: z.enum(["http", "x402", "policy", "settlement", "scanner"]),
  summary: z.string(),
  timestamp: z.string(),
  request: httpRequestEvidenceSchema.optional(),
  response: httpResponseEvidenceSchema.optional(),
  data: z.record(z.unknown()).optional(),
});

export type Evidence = z.infer<typeof evidenceSchema>;

export const findingSchema = z.object({
  id: z.string(),
  category: z.enum(FINDING_CATEGORIES),
  severity: z.enum(SEVERITIES),
  title: z.string(),
  description: z.string(),
  evidenceIds: z.array(z.string()).default([]),
  remediation: z.array(z.string()).default([]),
});

export type Finding = z.infer<typeof findingSchema>;

export const scanReportSchema = z.object({
  runId: z.string(),
  targetUrl: z.string().url(),
  method: scanMethodSchema,
  mode: scanModeSchema,
  score: z.number().int().min(0).max(100),
  verdict: z.enum(["pass", "warn", "fail"]),
  findings: z.array(findingSchema),
  evidence: z.array(evidenceSchema),
  okxReadiness: z.object({
    pass: z.boolean(),
    missing: z.array(z.string()),
  }),
  remediation: z.array(z.string()),
  reportToken: z.string().optional(),
  markdown: z.string().optional(),
  createdAt: z.string(),
});

export type ScanReport = z.infer<typeof scanReportSchema>;

const x402VersionSchema = z.union([z.literal(2), z.literal("2")]);

export const x402PaymentRequirementSchema = z
  .object({
    scheme: z.string().optional(),
    network: z.string().optional(),
    asset: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    maxAmountRequired: z.union([z.string(), z.number()]).optional(),
    payTo: z.string().optional(),
    resource: z.string().optional(),
    description: z.string().optional(),
    mimeType: z.string().optional(),
    maxTimeoutSeconds: z.number().optional(),
    outputSchema: z.unknown().optional(),
    extra: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type X402PaymentRequirement = z.infer<typeof x402PaymentRequirementSchema>;

export const x402ChallengeSchema = z
  .object({
    x402Version: x402VersionSchema.optional(),
    accepts: z.array(x402PaymentRequirementSchema).optional(),
    paymentRequirements: z.array(x402PaymentRequirementSchema).optional(),
    error: z.string().optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    const requirements = value.accepts ?? value.paymentRequirements;
    if (!requirements || requirements.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "x402 challenge must include accepts or paymentRequirements",
        path: ["accepts"],
      });
    }
  });

export type X402Challenge = z.infer<typeof x402ChallengeSchema>;

export const x402PaymentResponseSchema = z
  .object({
    x402Version: x402VersionSchema.optional(),
    success: z.boolean().optional(),
    transaction: z.string().optional(),
    txHash: z.string().optional(),
    network: z.string().optional(),
    payer: z.string().optional(),
    payTo: z.string().optional(),
    settlement: z.unknown().optional(),
  })
  .passthrough();

export type X402PaymentResponse = z.infer<typeof x402PaymentResponseSchema>;

export function getChallengeRequirements(challenge: X402Challenge): X402PaymentRequirement[] {
  return challenge.accepts ?? challenge.paymentRequirements ?? [];
}
