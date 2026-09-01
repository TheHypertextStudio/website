import { env, exports } from 'cloudflare:workers';
import { expect, test } from 'vitest';
import { claimVerification } from '../../workers/webmention/index';

test('rejects unsupported webmention methods in the Workers runtime', async () => {
  const response = await exports.default.fetch('https://hypertext.studio/webmention', {
    method: 'PUT',
  });
  expect(response.status).toBe(404);
});

test('atomically claims one verification for concurrent duplicate submissions', async () => {
  await env.DB.prepare('DROP TABLE IF EXISTS webmentions').run();
  await env.DB.prepare(
    `CREATE TABLE webmentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      verified_at TEXT,
      UNIQUE (source, target)
    )`,
  ).run();

  const source = 'https://source.example/post';
  const target = 'https://hypertext.studio/studies/example';
  const claims = await Promise.all([
    claimVerification(env, source, target),
    claimVerification(env, source, target),
  ]);

  expect(claims.filter(Boolean)).toHaveLength(1);
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM webmentions WHERE source = ?1 AND target = ?2',
  )
    .bind(source, target)
    .first<{ count: number }>();
  expect(row?.count).toBe(1);
});

test('lists verified mentions grouped by type in the Workers runtime', async () => {
  await env.DB.prepare('DROP TABLE IF EXISTS webmentions').run();
  await env.DB.prepare(
    `CREATE TABLE webmentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      mention_type TEXT NOT NULL DEFAULT 'mention',
      author_url TEXT,
      author_name TEXT,
      author_photo TEXT,
      content TEXT,
      content_html TEXT,
      published_at TEXT,
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      verified_at TEXT,
      UNIQUE (source, target)
    )`,
  ).run();

  const target = 'https://hypertext.studio/studies/example';
  await env.DB.prepare(
    `INSERT INTO webmentions
      (source, target, status, mention_type, author_name, content, verified_at)
     VALUES (?1, ?2, 'verified', 'like', 'A Reader', 'Useful.', CURRENT_TIMESTAMP)`,
  )
    .bind('https://reader.example/like', target)
    .run();

  const response = await exports.default.fetch(
    `https://hypertext.studio/webmentions?target=${encodeURIComponent(target)}`,
  );
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    target,
    mentions: {
      like: [{ author_name: 'A Reader', content: 'Useful.' }],
      mention: [],
      reply: [],
      repost: [],
    },
  });
});
