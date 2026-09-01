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
