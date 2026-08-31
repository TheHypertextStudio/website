/**
 * POST /webmention      receive a webmention
 * GET  /webmentions     list verified mentions for a target URL
 *
 * Per https://www.w3.org/TR/webmention/. Validates the source URL contains
 * a link to the target, parses h-entry microformats from the source body,
 * and stores the result in D1.
 */

import type { WebmentionBindings } from '../shared/types';
import { analyzeSource, MENTION_TYPES, type MentionType } from '../shared/microformats';

const SITE_ORIGIN = 'https://hypertext.studio';
const MAX_SOURCE_BYTES = 1024 * 1024;
const VERIFY_TIMEOUT_MS = 10_000;

export default {
  async fetch(req: Request, env: WebmentionBindings, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/webmention') {
      return receive(req, env, ctx);
    }
    if (req.method === 'GET' && url.pathname === '/webmentions') {
      const target = url.searchParams.get('target');
      if (!target) return json({ error: 'missing ?target=' }, 400);
      return list(env, target);
    }
    return new Response('Not Found', { status: 404 });
  },
};

async function receive(
  req: Request,
  env: WebmentionBindings,
  ctx: ExecutionContext,
): Promise<Response> {
  let source: string, target: string;
  try {
    const form = await req.formData();
    source = String(form.get('source') ?? '');
    target = String(form.get('target') ?? '');
  } catch {
    return json({ error: 'invalid form' }, 400);
  }

  if (!isHttpUrl(source) || !isHttpUrl(target)) {
    return json({ error: 'source and target must be http(s) URLs' }, 400);
  }
  if (new URL(target).origin !== SITE_ORIGIN) {
    return json({ error: 'target is not on hypertext.studio' }, 400);
  }

  // Fast path: store as pending, verify async. Returns 202 with a status hint.
  await env.DB.prepare(
    `INSERT OR REPLACE INTO webmentions (source, target, status)
     VALUES (?1, ?2, 'pending')`,
  )
    .bind(source, target)
    .run();

  ctx.waitUntil(verify(source, target, env));

  return new Response(JSON.stringify({ status: 'accepted' }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verify(source: string, target: string, env: WebmentionBindings): Promise<void> {
  let html: string;
  try {
    const res = await fetch(source, {
      redirect: 'follow',
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!res.ok) return reject(source, target, env);
    html = await readLimitedText(res, MAX_SOURCE_BYTES);
    if (!html.includes(target)) return reject(source, target, env);
  } catch {
    return reject(source, target, env);
  }

  const { type: mentionType, entry: meta } = analyzeSource(html, target, source);

  await env.DB.prepare(
    `UPDATE webmentions SET
       status = 'verified',
       mention_type = ?3,
       author_name = ?4,
       author_url = ?5,
       author_photo = ?6,
       content = ?7,
       content_html = ?8,
       published_at = ?9,
       verified_at = CURRENT_TIMESTAMP
     WHERE source = ?1 AND target = ?2`,
  )
    .bind(
      source,
      target,
      mentionType,
      meta.authorName,
      meta.authorUrl,
      meta.authorPhoto,
      meta.contentText,
      meta.contentHtml,
      meta.published,
    )
    .run();
}

async function readLimitedText(response: Response, limit: number): Promise<string> {
  const declaredLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new Error('source response exceeds verification limit');
  }
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error('source response exceeds verification limit');
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

async function reject(source: string, target: string, env: WebmentionBindings): Promise<void> {
  await env.DB.prepare(
    `UPDATE webmentions SET status = 'rejected' WHERE source = ?1 AND target = ?2`,
  )
    .bind(source, target)
    .run();
}

async function list(env: WebmentionBindings, target: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, source, mention_type, author_name, author_url, author_photo,
            content, published_at, received_at
       FROM webmentions
      WHERE target = ?1 AND status = 'verified'
      ORDER BY COALESCE(published_at, received_at) DESC
      LIMIT 200`,
  )
    .bind(target)
    .all<{
      id: number;
      source: string;
      mention_type: MentionType;
      author_name: string | null;
      author_url: string | null;
      author_photo: string | null;
      content: string | null;
      published_at: string | null;
      received_at: string;
    }>();

  // Group by type so the page layer renders aggregates without re-counting.
  const empty: Record<MentionType, typeof results> = {
    reply: [],
    mention: [],
    like: [],
    repost: [],
    bookmark: [],
  };
  const mentions = results.reduce((acc, row) => {
    // D1 stores mention_type as TEXT; validate at the boundary so a stray
    // value can't sneak through and end up keyed as `undefined`.
    const raw = row.mention_type;
    const type: MentionType = MENTION_TYPES.has(raw as MentionType)
      ? (raw as MentionType)
      : 'mention';
    acc[type].push(row);
    return acc;
  }, empty);

  return json({ target, mentions });
}

// ---------- helpers ---------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
