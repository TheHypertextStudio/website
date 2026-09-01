// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  site: 'https://hypertext.studio',
  trailingSlash: 'ignore',
  output: 'static',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  devToolbar: {
    enabled: false,
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
    }),
  },
  integrations: [
    // GFM (tables, footnotes, strikethrough, autolinks) + heading IDs +
    // self-linked headings give studies the distill.pub-shaped affordances
    // (footnotes at the foot, deep-link to any section) without per-MDX
    // boilerplate. See docs/content.md and docs/mission.md §10.
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'monthly',
      priority: 0.7,
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
});
