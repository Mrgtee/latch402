import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4020),
  CORS_ORIGIN: z.string().default("*"),
  LATCH402_DB_PATH: z.string().default(".data/latch402.db"),
  LATCH402_PUBLIC_BASE_URL: z.string().url().optional(),
  TARGET_ALLOWLIST: z.string().optional(),
  SCAN_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  SCAN_MAX_BODY_BYTES: z.coerce.number().int().positive().default(65536),
  npm_package_version: z.string().default("0.1.0"),
});

export function getConfig() {
  const env = envSchema.parse(process.env);
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    dbPath: env.NODE_ENV === "test" ? ":memory:" : env.LATCH402_DB_PATH,
    publicBaseUrl: env.LATCH402_PUBLIC_BASE_URL,
    targetAllowlist: env.TARGET_ALLOWLIST?.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
    scanTimeoutMs: env.SCAN_TIMEOUT_MS,
    scanMaxBodyBytes: env.SCAN_MAX_BODY_BYTES,
    version: env.npm_package_version,
  };
}

export type AppConfig = ReturnType<typeof getConfig>;
