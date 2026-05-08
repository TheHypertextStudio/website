/**
 * IndieAuth bearer-token verification.
 *
 * The Micropub spec mandates that the worker validate any access token by
 * sending it back to the issuing IndieAuth endpoint and confirming the `me`
 * claim matches the site's canonical URL.
 *
 * https://indieauth.spec.indieweb.org/#access-token-verification
 */

interface VerifyOptions {
  bearer: string;
  endpoint: string; // INDIEAUTH_ENDPOINT
  expectedMe: string; // canonical SITE_URL
}

export async function verifyIndieAuth({
  bearer,
  endpoint,
  expectedMe,
}: VerifyOptions): Promise<boolean> {
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return false;
  const data = (await res.json().catch(() => null)) as { me?: string } | null;
  if (!data?.me) return false;
  return new URL(data.me).origin === new URL(expectedMe).origin;
}
