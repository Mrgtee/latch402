export type PiiHit = {
  path: string;
  rule: string;
  preview: string;
};

const piiKeyPattern =
  /(email|phone|mobile|firstName|lastName|fullName|givenName|familyName|address|street|city|postal|zipcode|passport|ssn|dob|birth)/i;
const personalNameContextPattern =
  /(user|customer|payer|buyer|recipient|person|profile|contact|owner|client)/i;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\d .()-]{7,}\d)/;

function preview(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

function keyLooksLikePii(key: string, path: string): boolean {
  if (piiKeyPattern.test(key)) return true;
  return key.toLowerCase() === "name" && personalNameContextPattern.test(path);
}

function walk(value: unknown, path: string, hits: PiiHit[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, hits));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (keyLooksLikePii(key, childPath)) {
        hits.push({ path: childPath, rule: "pii-like key", preview: preview(nested) });
      }
      walk(nested, childPath, hits);
    }
    return;
  }

  if (typeof value === "string") {
    if (emailPattern.test(value)) {
      hits.push({ path, rule: "email-like value", preview: preview(value) });
    }
    if (phonePattern.test(value)) {
      hits.push({ path, rule: "phone-like value", preview: preview(value) });
    }
  }
}

export function findPii(value: unknown): PiiHit[] {
  const hits: PiiHit[] = [];
  walk(value, "", hits);
  return hits;
}
