export interface SiteEnv {
  ASSETS: Fetcher;
  STUDIO_SOURCE_SHA: string;
  STUDIO_ARTIFACT_SHA256: string;
  STUDIO_CANDIDATE_ID: string;
}

const RELEASE_PATH = '/__studio/release';

export default {
  async fetch(request: Request, env: SiteEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== RELEASE_PATH) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET', 'Cache-Control': 'no-store' },
      });
    }

    const metadata = {
      sourceSha: env.STUDIO_SOURCE_SHA,
      artifactSha256: env.STUDIO_ARTIFACT_SHA256,
      candidateId: env.STUDIO_CANDIDATE_ID,
    };
    if (Object.values(metadata).some((value) => !value)) {
      return Response.json(
        { error: 'Release metadata is not configured' },
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    return Response.json(metadata, { headers: { 'Cache-Control': 'no-store' } });
  },
};
