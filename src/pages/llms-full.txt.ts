import type { APIRoute } from 'astro';
import t from '@/i18n';
import productsData from '@/data/products.json';
import { SITE_URL, SITE_NAME } from '@/consts';
import { getPublishedStudies } from '@/lib/published-content';

export const GET: APIRoute = async () => {
  const studies = await getPublishedStudies().catch(() => []);

  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${t.site.description}`,
    '',
    `Canonical: ${SITE_URL}`,
    '',
    '---',
    '',
    '## Products',
    '',
    ...productsData.map(
      (p: (typeof productsData)[number]) => `- **${p.name}** — ${p.tagline} (${p.url})`,
    ),
    '',
    '## Studies',
    '',
    studies.length
      ? studies
          .map((s: { id: string; data: { title: string; summary: string } }) => {
            return `### ${s.data.title}\n\n${s.data.summary}\n\nURL: ${SITE_URL}/studies/${s.id}\n`;
          })
          .join('\n')
      : '(none yet)',
    '',
    '## Privacy',
    '',
    t.privacy.intro,
    '',
    ...t.privacy.sections.map((s) => `### ${s.heading}\n\n${s.body}\n`),
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
