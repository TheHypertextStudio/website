import { expect, test } from '@playwright/test';
import { STATIC_FILES } from '../fixtures/site';

test.describe('Discovery files', () => {
  for (const f of STATIC_FILES) {
    test(`${f.path} returns 200`, async ({ request }) => {
      const res = await request.get(f.path);
      expect(res.status()).toBe(200);
    });
  }

  test('robots.txt blocks GPTBot, ClaudeBot, anthropic-ai, Google-Extended', async ({
    request,
  }) => {
    const body = (await (await request.get('/robots.txt')).text()).toLowerCase();
    for (const ua of ['gptbot', 'claudebot', 'anthropic-ai', 'google-extended']) {
      expect(body).toContain(`user-agent: ${ua}`);
    }
    expect(body).toContain('disallow: /');
    expect(body).toContain('sitemap:');
  });

  test('robots.txt allows on-demand retrieval agents', async ({ request }) => {
    const body = (await (await request.get('/robots.txt')).text()).toLowerCase();
    expect(body).toContain('user-agent: chatgpt-user');
    expect(body).toContain('user-agent: claude-user');
    expect(body).toContain('user-agent: perplexitybot');
  });

  test('humans.txt has /TEAM, /THANKS, /SITE sections', async ({ request }) => {
    const body = await (await request.get('/humans.txt')).text();
    expect(body).toContain('/* TEAM */');
    expect(body).toContain('/* THANKS */');
    expect(body).toContain('/* SITE */');
  });

  test('llms.txt is markdown summarising the studio', async ({ request }) => {
    const body = await (await request.get('/llms.txt')).text();
    expect(body).toContain('# Hypertext Studio');
    expect(body).toContain('LogDate');
    expect(body).toContain('Curfew');
    expect(body).toContain('Docket');
    expect(body).not.toContain('Termsly');
  });

  test('llms-full.txt concatenates content', async ({ request }) => {
    const body = await (await request.get('/llms-full.txt')).text();
    expect(body).toContain('Hypertext Studio builds software for humans');
    expect(body).toContain('Curfew, the launch study');
    expect(body.length).toBeGreaterThan(500);
    expect(body).not.toContain('Termsly');
    expect(body).not.toContain('The locked delay');
    expect(body).not.toContain('/studies/three-products-one-privacy-stance');
  });

  test('site.webmanifest is valid JSON with required keys', async ({ request }) => {
    const body = await (await request.get('/site.webmanifest')).text();
    const data = JSON.parse(body);
    expect(data.name).toBe('Hypertext Studio');
    expect(data.short_name).toBe('Hypertext');
    expect(Array.isArray(data.icons)).toBe(true);
    expect(data.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('security.txt has Contact + Expires + Preferred-Languages', async ({ request }) => {
    const body = await (await request.get('/.well-known/security.txt')).text();
    expect(body).toMatch(/^Contact:/m);
    expect(body).toMatch(/^Expires:/m);
    expect(body).toMatch(/^Preferred-Languages:/m);
  });

  test('webfinger has the studio actor metadata', async ({ request }) => {
    const body = await (await request.get('/.well-known/webfinger')).text();
    const data = JSON.parse(body);
    expect(data.subject).toContain('hypertext.studio');
    expect(Array.isArray(data.links)).toBe(true);
  });
});
