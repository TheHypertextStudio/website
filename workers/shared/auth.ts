/**
 * IndieAuth bearer-token verification.
 *
 * The Micropub spec mandates that the worker validate any access token by
 * sending it back to the issuing IndieAuth endpoint and confirming the `me`
 * claim matches the site's canonical URL.
 *
 * https://indieauth.spec.indieweb.org/#access-token-verification
 */

import { fetchWithTimeout, normalizeCanonicalIdentity } from './http';

interface VerifyOptions {
  bearer: string;
  endpoint: string; // INDIEAUTH_ENDPOINT
  expectedMe: string; // canonical SITE_URL
  requiredScope?: string;
}

export async function verifyIndieAuth({
  bearer,
  endpoint,
  expectedMe,
  requiredScope,
}: VerifyOptions): Promise<boolean> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      endpoint,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: 'application/json',
        },
      },
      5_000,
    );
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const data = (await res.json().catch(() => null)) as {
    me?: string;
    scope?: string | string[];
  } | null;
  if (!data?.me) return false;
  const actualIdentity = normalizeCanonicalIdentity(data.me);
  const expectedIdentity = normalizeCanonicalIdentity(expectedMe);
  if (!actualIdentity || !expectedIdentity || actualIdentity !== expectedIdentity) return false;
  if (!requiredScope) return true;

  const scopes = Array.isArray(data.scope)
    ? data.scope
    : (data.scope ?? '').split(/\s+/).filter(Boolean);
  return scopes.includes(requiredScope);
}
