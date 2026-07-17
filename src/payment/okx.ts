import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { type RoutesConfig } from "@okxweb3/x402-core/server";
import { paymentMiddleware, x402ResourceServer } from "@okxweb3/x402-express";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { type RequestHandler } from "express";

import { type AppConfig } from "../config.js";

const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/;

export type OkxPaymentConfigCheck = { ok: true; price: string } | { ok: false; missing: string[] };

type OkxFacilitatorOptions = {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  baseUrl?: string;
  syncSettle: boolean;
};

function normalizePriceUsd(value: string): string | undefined {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!/^\d+(?:\.\d{1,6})?$/.test(trimmed)) return undefined;
  if (Number(trimmed) <= 0) return undefined;
  return `$${trimmed}`;
}

export function validateOkxPaymentConfig(config: AppConfig): OkxPaymentConfigCheck {
  const missing: string[] = [];
  if (!config.payToAddress || !evmAddressPattern.test(config.payToAddress))
    missing.push("PAY_TO_ADDRESS");
  if (!config.okxApiKey) missing.push("OKX_API_KEY");
  if (!config.okxSecretKey) missing.push("OKX_SECRET_KEY");
  if (!config.okxPassphrase) missing.push("OKX_PASSPHRASE");
  const price = normalizePriceUsd(config.x402PriceUsd);
  if (!price) missing.push("X402_PRICE_USD");
  return missing.length === 0 && price ? { ok: true, price } : { ok: false, missing };
}

export function buildOkxFacilitatorOptions(config: AppConfig): OkxFacilitatorOptions {
  const options: OkxFacilitatorOptions = {
    apiKey: config.okxApiKey ?? "",
    secretKey: config.okxSecretKey ?? "",
    passphrase: config.okxPassphrase ?? "",
    syncSettle: config.okxSyncSettle,
  };

  if (config.okxFacilitatorBaseUrl) {
    options.baseUrl = config.okxFacilitatorBaseUrl;
  }

  return options;
}

export function buildOkxScanRoutes(
  config: AppConfig,
  payToAddress: string,
  price: string,
): RoutesConfig {
  const scanRoute = {
    accepts: [
      {
        scheme: "exact" as const,
        network: config.x402Network,
        payTo: payToAddress,
        price,
      },
    ],
    description: "latch402 evidence-backed x402 payment-flow security scan",
    mimeType: "application/json",
  };

  return {
    "GET /api/v1/scan": scanRoute,
    "POST /api/v1/scan": scanRoute,
  } satisfies RoutesConfig;
}

export function createOkxPaymentGate(config: AppConfig): RequestHandler | undefined {
  if (!config.okxPaymentEnabled) return undefined;

  const check = validateOkxPaymentConfig(config);
  if (!check.ok) {
    throw new Error(
      `OKX x402 payment gate is enabled but missing/invalid: ${check.missing.join(", ")}`,
    );
  }

  const payToAddress = config.payToAddress as string;

  const facilitatorClient = new OKXFacilitatorClient(buildOkxFacilitatorOptions(config));

  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    config.x402Network,
    new ExactEvmScheme(),
  );

  const routes = buildOkxScanRoutes(config, payToAddress, check.price);

  return paymentMiddleware(routes, resourceServer, undefined, undefined, true);
}
