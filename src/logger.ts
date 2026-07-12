import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.payment-signature",
      "req.headers.payment-response",
      "*.OKX_API_KEY",
      "*.OKX_SECRET_KEY",
      "*.OKX_PASSPHRASE",
      "*.EVM_PRIVATE_KEY",
    ],
    remove: true,
  },
});

