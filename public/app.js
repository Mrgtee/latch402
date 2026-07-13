const state = {
  challenge: null,
  lastRequest: null,
};

const els = {
  serviceState: document.querySelector("#service-state"),
  scanForm: document.querySelector("#scan-form"),
  targetUrl: document.querySelector("#target-url"),
  method: document.querySelector("#method"),
  mode: document.querySelector("#mode"),
  expectedNetwork: document.querySelector("#expected-network"),
  body: document.querySelector("#body"),
  formNote: document.querySelector("#form-note"),
  loadExample: document.querySelector("#load-example"),
  copyCurl: document.querySelector("#copy-curl"),
  copyChallenge: document.querySelector("#copy-challenge"),
  challengeStatus: document.querySelector("#challenge-status"),
  challengeGrid: document.querySelector("#challenge-grid"),
  challengeJson: document.querySelector("#challenge-json"),
  reportForm: document.querySelector("#report-form"),
  runId: document.querySelector("#run-id"),
  reportToken: document.querySelector("#report-token"),
  reportOutput: document.querySelector("#report-output"),
  checks: Array.from(document.querySelectorAll("#check-list li")),
};

function setServiceState(kind, text) {
  els.serviceState.classList.remove("ok", "bad");
  if (kind) els.serviceState.classList.add(kind);
  els.serviceState.querySelector("span:last-child").textContent = text;
}

function setCheck(index, stateName) {
  const item = els.checks[index];
  if (!item) return;
  item.classList.remove("ok", "bad");
  if (stateName) item.classList.add(stateName);
}

function stringify(value) {
  return JSON.stringify(value, null, 2);
}

function decodeBase64Json(value) {
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, function toByte(char) {
    return char.charCodeAt(0);
  });
  return JSON.parse(new TextDecoder().decode(bytes));
}

function short(value) {
  if (!value) return "-";
  if (value.length <= 28) return value;
  return value.slice(0, 12) + "..." + value.slice(-10);
}

function formatAmount(requirement) {
  if (!requirement || !requirement.amount) return "-";
  const amount = Number(requirement.amount);
  if (!Number.isFinite(amount)) return requirement.amount;
  return (amount / 1000000).toFixed(2) + " USD";
}

function renderChallenge(challenge, responseStatus) {
  state.challenge = challenge;
  const requirement = (challenge && challenge.accepts && challenge.accepts[0]) || {};
  const resourceUrl = (challenge && challenge.resource && challenge.resource.url) || "-";
  const values = [
    challenge && challenge.x402Version ? "v" + challenge.x402Version : "-",
    resourceUrl,
    requirement.network || "-",
    formatAmount(requirement),
    short(requirement.asset),
    short(requirement.payTo),
  ];

  Array.from(els.challengeGrid.querySelectorAll("strong")).forEach(
    function updateValue(node, index) {
      node.textContent = values[index] || "-";
      if (index === 1) node.title = resourceUrl;
      if (index === 4) node.title = requirement.asset || "";
      if (index === 5) node.title = requirement.payTo || "";
    },
  );

  els.challengeJson.textContent = stringify(challenge || {});
  els.copyChallenge.disabled = !challenge;
  els.challengeStatus.textContent =
    responseStatus === 402
      ? "Captured live 402 payment requirement."
      : "Received HTTP " + responseStatus + ".";

  setCheck(3, responseStatus === 402 ? "ok" : "bad");
  setCheck(4, requirement.network === "eip155:196" ? "ok" : "bad");
  setCheck(5, typeof resourceUrl === "string" && resourceUrl.startsWith("https://") ? "ok" : "bad");
}

function buildPayload() {
  const payload = {
    targetUrl: els.targetUrl.value.trim(),
    method: els.method.value,
    mode: els.mode.value,
    expectedNetwork: els.expectedNetwork.value,
    authorizationConfirmed: true,
  };

  const rawBody = els.body.value.trim();
  if (payload.method === "POST" && rawBody) {
    payload.body = JSON.parse(rawBody);
  }

  return payload;
}

function buildCurl(payload) {
  const body = JSON.stringify(payload);
  const escapedBody = body.replaceAll("'", "'" + "\\'" + "'");
  const lines = [
    "curl -i -X POST https://latch402-production.up.railway.app/api/v1/scan",
    '  -H "content-type: application/json"',
    "  --data-binary '" + escapedBody + "'",
  ];
  return lines.join(" \\\n");
}

async function copyText(text, control, doneText) {
  await navigator.clipboard.writeText(text);
  const original = control.textContent;
  control.textContent = doneText || "Copied";
  window.setTimeout(function restoreText() {
    control.textContent = original;
  }, 1200);
}

async function checkService() {
  try {
    const responses = await Promise.all([fetch("/health"), fetch("/openapi.json")]);
    const health = responses[0];
    const openapi = responses[1];
    setCheck(
      0,
      window.location.protocol === "https:" || window.location.hostname === "localhost"
        ? "ok"
        : "bad",
    );
    setCheck(1, health.ok ? "ok" : "bad");
    setCheck(2, openapi.ok ? "ok" : "bad");
    setServiceState(
      health.ok && openapi.ok ? "ok" : "bad",
      health.ok && openapi.ok ? "Service online" : "Service degraded",
    );
  } catch (error) {
    void error;
    setServiceState("bad", "Service unavailable");
    setCheck(1, "bad");
    setCheck(2, "bad");
  }
}

els.loadExample.addEventListener("click", function loadExample() {
  els.targetUrl.value = "https://example.com";
  els.method.value = "GET";
  els.mode.value = "passive";
  els.expectedNetwork.value = "eip155:196";
  els.body.value = "";
});

els.copyCurl.addEventListener("click", async function copyCurl() {
  try {
    const payload = buildPayload();
    await copyText(buildCurl(payload), els.copyCurl, "Curl copied");
  } catch (error) {
    els.formNote.textContent = "Cannot copy curl: " + error.message;
  }
});

els.copyChallenge.addEventListener("click", async function copyChallenge() {
  if (!state.challenge) return;
  await copyText(stringify(state.challenge), els.copyChallenge, "JSON copied");
});

els.scanForm.addEventListener("submit", async function submitScan(event) {
  event.preventDefault();
  els.formNote.textContent = "Submitting unpaid preflight...";

  let payload;
  try {
    payload = buildPayload();
  } catch (error) {
    els.formNote.textContent = "POST body is not valid JSON: " + error.message;
    return;
  }

  state.lastRequest = payload;

  try {
    const response = await fetch("/api/v1/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const paymentRequired = response.headers.get("payment-required");
    const text = await response.text();
    let parsedBody = {};
    if (text) {
      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = { raw: text };
      }
    }

    if (paymentRequired) {
      const challenge = decodeBase64Json(paymentRequired);
      renderChallenge(challenge, response.status);
      els.formNote.textContent =
        "Payment requirement captured. Use an x402-capable client to pay and replay for the report.";
      return;
    }

    if (response.ok) {
      renderChallenge({ report: parsedBody }, response.status);
      els.formNote.textContent = "Paid scan completed and returned a report.";
      if (parsedBody.runId) els.runId.value = parsedBody.runId;
      if (parsedBody.reportToken) els.reportToken.value = parsedBody.reportToken;
      return;
    }

    renderChallenge(parsedBody, response.status);
    els.formNote.textContent = "Request completed with HTTP " + response.status + ".";
  } catch (error) {
    els.formNote.textContent = "Request failed: " + error.message;
    renderChallenge({ error: error.message }, 0);
  }
});

els.reportForm.addEventListener("submit", async function submitReport(event) {
  event.preventDefault();
  const runId = els.runId.value.trim();
  const token = els.reportToken.value.trim();
  if (!runId || !token) {
    els.reportOutput.textContent = stringify({ error: "runId and report token are required" });
    return;
  }

  try {
    const response = await fetch(
      "/api/v1/reports/" + encodeURIComponent(runId) + "?token=" + encodeURIComponent(token),
    );
    const report = await response.json();
    els.reportOutput.textContent = stringify(report);
  } catch (error) {
    els.reportOutput.textContent = stringify({ error: error.message });
  }
});

checkService();
