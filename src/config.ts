import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4020),
  CORS_ORIGIN: z.string().default("*"),
  npm_package_version: z.string().default("0.1.0"),
});

export function getConfig() {
  const env = envSchema.parse(process.env);
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    version: env.npm_package_version,
  };
}

