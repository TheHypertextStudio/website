export class BodyTooLargeError extends Error {
  constructor() {
    super('request body exceeds limit');
    this.name = 'BodyTooLargeError';
  }
}

export async function readLimitedBody(request: Request, limit: number): Promise<string> {
  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new BodyTooLargeError();
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let body = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

export function normalizeCanonicalIdentity(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function escapeMarkdownInput(value: string): string {
  return value.replaceAll('<', '&lt;');
}
