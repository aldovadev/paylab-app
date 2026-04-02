// Keys whose values should always be masked
const SENSITIVE_HEADER_KEYS = [
  'authorization',
  'stripe-signature',
  'paypal-auth-assertion',
  'paypal-client-id',
  'paypal-client-secret',
];

// Patterns for keys in nested objects that should be masked
const SENSITIVE_KEY_PATTERNS = [
  /secret/i,
  /token/i,
  /key/i,
  /password/i,
  /credential/i,
  /authorization/i,
  /signature/i,
  /client_id/i,
  /client_secret/i,
  /access_token/i,
  /api_key/i,
];

function maskValue(value: unknown): string {
  const str = typeof value === 'string' ? value : String(value);
  if (str.length <= 8) return '****';
  const last4 = str.slice(-4);
  return `****...${last4}`;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_HEADER_KEYS.includes(lower)) return true;
  return SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
}

// Sanitize a flat headers object (e.g. HTTP headers)
export function sanitizeHeaders(
  headers: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!headers) return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (isSensitiveKey(key) && value) {
      result[key] = maskValue(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Deep-sanitize an object, masking values of sensitive keys at any depth
export function sanitizeObject(
  obj: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!obj) return null;
  return deepSanitize(obj) as Record<string, unknown>;
}

function deepSanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key) && val) {
        result[key] = maskValue(val);
      } else {
        result[key] = deepSanitize(val);
      }
    }
    return result;
  }
  return value;
}
