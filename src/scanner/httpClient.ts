import { fetch, Headers } from "undici";

import { type AppConfig } from "../config.js";
import { type Evidence, type ScanRequest } from "../domain/schemas.js";
import { evidenceId, isoNow, previewBody, redactHeaders, sha256 } from "./evidence.js";

export type HttpProbeResult = {
  evidence: Evidence;
  status: number;
  headers: Record<string, string>;
  bodyText: string;
};

function normalizeRequestHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalizedKey = key.toLowerCase();
    if (["host", "content-length", "connection"].includes(normalizedKey)) continue;
    output[key] = value;
  }
  return output;
}

function bodyForRequest(request: ScanRequest): string | undefined {
  if (request.method !== "POST" || request.body === undefined) return undefined;
  return typeof request.body === "string" ? request.body : JSON.stringify(request.body);
}

function headersToRecord(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key.toLowerCase()] = value;
  });
  return output;
}

export async function probeTarget(
  request: ScanRequest,
  config: AppConfig,
  extraHeaders: Record<string, string> = {},
  summary = "HTTP probe",
): Promise<HttpProbeResult> {
  const headers = new Headers(normalizeRequestHeaders(request.headers));
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.append(key, value);
  }

  if (request.method === "POST" && request.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const body = bodyForRequest(request);
  const response = await fetch(request.targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(config.scanTimeoutMs),
  });

  const bodyText = (await response.text()).slice(0, config.scanMaxBodyBytes);
  const responseHeaders = headersToRecord(response.headers);
  const requestHeaders = redactHeaders(Object.fromEntries(headers.entries()));

  const evidence: Evidence = {
    id: evidenceId("http"),
    kind: "http",
    summary,
    timestamp: isoNow(),
    request: {
      method: request.method,
      url: request.targetUrl,
      headers: requestHeaders,
      bodySha256: body ? sha256(String(body)) : undefined,
    },
    response: {
      status: response.status,
      headers: redactHeaders(responseHeaders),
      bodyPreview: previewBody(bodyText),
      bodySha256: bodyText ? sha256(bodyText) : undefined,
    },
  };

  return { evidence, status: response.status, headers: responseHeaders, bodyText };
}
