import { z } from "zod";

import {
  OKX_SUPPORTED_NETWORKS,
  OKX_X_LAYER_MAINNET,
  OKX_X_LAYER_TESTNET,
} from "./domain/constants.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4020),
  CORS_ORIGIN: z.string().default("*"),
  LATCH402_DB_PATH: z.string().default(".data/latch402.db"),
  LATCH402_PUBLIC_BASE_URL: z.string().url().optional(),
  LATCH402_PAYMENT_MODE: z.enum(["auto", "okx", "off"]).default("auto"),
  TARGET_ALLOWLIST: z.string().optional(),
  SCAN_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  SCAN_MAX_BODY_BYTES: z.coerce.number().int().positive().default(65536),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  SCAN_ACTIVE_PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
  SCAN_SPEND_CAP_USD: z.coerce.number().nonnegative().default(0),
  EVM_PRIVATE_KEY: z.string().optional(),
  X402_ACTIVE_NETWORK: z.enum(OKX_SUPPORTED_NETWORKS).default(OKX_X_LAYER_TESTNET),
  X402_NETWORK: z.enum(OKX_SUPPORTED_NETWORKS).default(OKX_X_LAYER_MAINNET),
  X402_PRICE_USD: z.string().default("0.05"),
  PAY_TO_ADDRESS: z.string().optional(),
  OKX_API_KEY: z.string().optional(),
  OKX_SECRET_KEY: z.string().optional(),
  OKX_PASSPHRASE: z.string().optional(),
  OKX_FACILITATOR_BASE_URL: z.string().url().optional(),
  OKX_SYNC_SETTLE: z.enum(["true", "false"]).default("false"),
  X_LAYER_RPC_URL: z.string().url().optional(),
  npm_package_version: z.string().default("0.1.0"),
});

export function getConfig() {
  const env = envSchema.parse(process.env);
  const paymentMode = env.LATCH402_PAYMENT_MODE;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    dbPath: env.NODE_ENV === "test" ? ":memory:" : env.LATCH402_DB_PATH,
    publicBaseUrl: env.LATCH402_PUBLIC_BASE_URL,
    paymentMode,
    okxPaymentEnabled:
      paymentMode === "okx" || (paymentMode === "auto" && env.NODE_ENV === "production"),
    targetAllowlist: env.TARGET_ALLOWLIST?.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
    scanTimeoutMs: env.SCAN_TIMEOUT_MS,
    scanMaxBodyBytes: env.SCAN_MAX_BODY_BYTES,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,
    activePaymentsEnabled: env.SCAN_ACTIVE_PAYMENTS_ENABLED === "true",
    scanSpendCapUsd: env.SCAN_SPEND_CAP_USD,
    evmPrivateKey: env.EVM_PRIVATE_KEY,
    activeNetwork: env.X402_ACTIVE_NETWORK,
    x402Network: env.X402_NETWORK,
    x402PriceUsd: env.X402_PRICE_USD,
    payToAddress: env.PAY_TO_ADDRESS,
    okxApiKey: env.OKX_API_KEY,
    okxSecretKey: env.OKX_SECRET_KEY,
    okxPassphrase: env.OKX_PASSPHRASE,
    okxFacilitatorBaseUrl: env.OKX_FACILITATOR_BASE_URL,
    okxSyncSettle: env.OKX_SYNC_SETTLE === "true",
    xLayerRpcUrl: env.X_LAYER_RPC_URL,
    version: env.npm_package_version,
  };
}

export type AppConfig = ReturnType<typeof getConfig>;
