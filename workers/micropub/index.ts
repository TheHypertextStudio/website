/**
 * Micropub endpoint. Accepts notes (form-encoded h=entry posts) and writes
 * them as MDX files in src/content/notes/ via GitHub's Contents API. The
 * IndieAuth bearer is verified against the configured token endpoint.
 *
 * Spec: https://www.w3.org/TR/micropub/
 */

import { verifyIndieAuth } from '../shared/auth';
import type { MicropubBindings } from '../shared/types';

const SITE_URL = 'https://hypertext.studio';

export default {
  async fetch(req: Request, env: MicropubBindings): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/micropub') {
      return getConfig(url);
    }

    if (req.method === 'POST' && url.pathname === '/micropub') {
      return create(req, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

function getConfig(url: URL): Response {
  if (url.searchParams.get('q') === 'config') {
    return json({
      'media-endpoint': null,
      'syndicate-to': [],
      'post-types': [
        { type: 'note', name: 'Note' },
        { type: 'bookmark', name: 'Bookmark' },
      ],
    });
  }
  if (url.searchParams.get('q') === 'syndicate-to') {
    return json({ 'syndicate-to': [] });
  }
  return new Response('OK', { status: 200 });
}

async function create(req: Request, env: MicropubBindings): Promise<Response> {
  const auth = req.headers.get('Authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'unauthorized' }, 401);
  }
  const ok = await verifyIndieAuth({
    bearer: auth.slice(7).trim(),
    endpoint: env.INDIEAUTH_ENDPOINT,
    expectedMe: SITE_URL,
    requiredScope: 'create',
  });
  if (!ok) return json({ error: 'forbidden' }, 403);

  const ct = req.headers.get('Content-Type') ?? '';
  let h = '',
    content = '',
    categories: string[] = [],
    slug = '';
  if (ct.includes('application/json')) {
    const body = (await req.json()) as {
      type?: string[];
      properties?: Record<string, string[]>;
    };
    h = (body.type ?? [])[0]?.replace(/^h-/, '') ?? 'entry';
    content = body.properties?.content?.[0] ?? '';
    categories = body.properties?.category ?? [];
    slug = body.properties?.['mp-slug']?.[0] ?? '';
  } else {
    const form = await req.formData();
    h = String(form.get('h') ?? 'entry');
    content = String(form.get('content') ?? '');
    const cat = form.get('category[]') ?? form.get('category');
    categories = cat
      ? String(cat)
          .split(',')
          .map((s) => s.trim())
      : [];
    slug = String(form.get('mp-slug') ?? '');
  }

  if (h !== 'entry' || !content.trim()) {
    return json({ error: 'invalid_request' }, 400);
  }

  const finalSlug = slug ? validateSlug(slug) : makeSlug(content);
  if (!finalSlug) {
    return json({ error: 'invalid_request' }, 400);
  }
  const noteUrl = `${SITE_URL}/notes/${finalSlug}`;

  const frontmatter = {
    publishedAt: new Date().toISOString(),
    syndicatedTo: [],
    tags: categories,
  };
  const body = `---\n${Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
    .join('\n')}\n---\n\n${content}\n`;

  const path = `${env.NOTES_PATH}/${finalSlug}.mdx`;
  const sha = await commitFile(env, path, body, `chore: micropub note ${finalSlug}`);

  return new Response(null, {
    status: 202,
    headers: {
      Location: noteUrl,
      'X-Commit-SHA': sha,
    },
  });
}

async function commitFile(
  env: MicropubBindings,
  path: string,
  body: string,
  message: string,
): Promise<string> {
  const api = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const res = await fetch(api, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'hypertext-studio-micropub',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(body))),
      branch: env.DEFAULT_BRANCH,
    }),
  });
  if (!res.ok) {
    throw new Error(`github contents api failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { commit?: { sha?: string } };
  return data.commit?.sha ?? '';
}

function makeSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `note-${Date.now()}`
  );
}

function validateSlug(slug: string): string | null {
  const candidate = slug.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate) && candidate.length <= 80 ? candidate : null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
