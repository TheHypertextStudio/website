import type { APIRoute } from 'astro';
import products from '@/data/products.json';
import { SITE_NAME, SITE_URL } from '@/consts';
import t from '@/i18n';

export const GET: APIRoute = () => {
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${t.site.description}`,
    '',
    `Canonical: ${SITE_URL}`,
    '',
    '## Services',
    '',
    'Work directly with Willie Chalmers on product and technical consulting, software redesign, AI product decisions, or custom websites, apps, and platforms.',
    `Services: ${SITE_URL}/services/`,
    `Find a starting point: ${SITE_URL}/work-together/`,
    'Nonprofits, community projects, and social causes can ask about reduced rates.',
    '',
    '## Products',
    '',
    ...products.map((product) => `- ${product.name}: ${product.tagline} ${product.url}`),
    '',
    '## Pages',
    '',
    `- About: ${SITE_URL}/about`,
    `- Privacy: ${SITE_URL}/privacy`,
    `- Contact: ${SITE_URL}/contact`,
    `- Studies: ${SITE_URL}/studies`,
    `- Full machine-readable context: ${SITE_URL}/llms-full.txt`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
