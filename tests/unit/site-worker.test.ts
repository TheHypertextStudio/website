import { describe, expect, it, vi } from 'vitest';
import worker, { type SiteEnv } from '../../workers/site/index';

const env = (overrides: Partial<SiteEnv> = {}): SiteEnv => ({
  ASSETS: { fetch: vi.fn(async () => new Response('asset')) } as unknown as Fetcher,
  STUDIO_SOURCE_SHA: 'source-sha',
  STUDIO_ARTIFACT_SHA256: 'artifact-sha',
  STUDIO_CANDIDATE_ID: 'candidate-id',
  ...overrides,
});

describe('site Worker', () => {
  it('returns the release identity without caching it', async () => {
    const response = await worker.fetch(
      new Request('https://hypertext.test/__studio/release'),
      env(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      sourceSha: 'source-sha',
      artifactSha256: 'artifact-sha',
      candidateId: 'candidate-id',
    });
  });

  it('rejects non-GET release probes', async () => {
    const response = await worker.fetch(
      new Request('https://hypertext.test/__studio/release', { method: 'POST' }),
      env(),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
  });

  it('delegates every other path and query to the static asset binding', async () => {
    const bindings = env();
    const request = new Request('https://hypertext.test/studies/example?view=full');

    await worker.fetch(request, bindings);

    expect(bindings.ASSETS.fetch).toHaveBeenCalledWith(request);
  });

  it('does not claim a release identity when deployment metadata is missing', async () => {
    const response = await worker.fetch(
      new Request('https://hypertext.test/__studio/release'),
      env({ STUDIO_CANDIDATE_ID: '' }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
