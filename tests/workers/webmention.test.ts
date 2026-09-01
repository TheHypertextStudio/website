import { env, SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';
import { claimVerification } from '../../workers/webmention/index';

test('rejects unsupported webmention methods in the Workers runtime', async () => {
  const response = await SELF.fetch('https://hypertext.studio/webmention', { method: 'PUT' });
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
