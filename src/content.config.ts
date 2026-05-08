import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * Tests need real content to exercise the [slug] routes; the public site
 * ships with the empty studies index until something real is published.
 *
 * `HYPERTEXT_INCLUDE_FIXTURES=1` (set by playwright.config.ts's webServer
 * env) merges the fixtures under tests/fixtures/content/* into the public
 * collections at build time. Unset, the public build sees only src/content/*.
 */
const includeFixtures = process.env.HYPERTEXT_INCLUDE_FIXTURES === '1';

type LoaderLike = ReturnType<typeof glob>;

function mergedGlob(bases: string[], pattern: string): LoaderLike {
  const sources = bases.map((base) => glob({ pattern, base }));
  return {
    name: 'merged-glob',
    async load(ctx) {
      for (const source of sources) await source.load(ctx);
    },
    // Each source advertises its own schema; the collection-level schema in
    // defineCollection() is the authoritative one anyway, so we don't merge.
  } as LoaderLike;
}

function studiesLoader(): LoaderLike {
  if (!includeFixtures) {
    return glob({ pattern: '**/*.{md,mdx}', base: './src/content/studies' });
  }
  return mergedGlob(['./src/content/studies', './tests/fixtures/content/studies'], '**/*.{md,mdx}');
}

function notesLoader(): LoaderLike {
  if (!includeFixtures) {
    return glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' });
  }
  return mergedGlob(['./src/content/notes', './tests/fixtures/content/notes'], '**/*.{md,mdx}');
}

const studies = defineCollection({
  loader: studiesLoader(),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.coerce.date(),
    modifiedAt: z.coerce.date().optional(),
    author: z.string().default('Hypertext Studio'),
    product: z.enum(['logdate', 'curfew', 'termsly']).optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    wordCount: z.number().optional(),
    timeRequired: z.string().optional(),
    // POSSE: canonical lives here; copies elsewhere are listed in the colophon.
    syndicatedTo: z.array(z.url()).default([]),
    // For studies that themselves respond to outside work — drives u-in-reply-to.
    inReplyTo: z.url().optional(),
  }),
});

const notes = defineCollection({
  loader: notesLoader(),
  schema: z.object({
    publishedAt: z.coerce.date(),
    syndicatedTo: z.array(z.url()).default([]),
    tags: z.array(z.string()).default([]),
    inReplyTo: z.url().optional(),
  }),
});

export const collections = { studies, notes };
