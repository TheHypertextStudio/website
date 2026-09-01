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

/**
 * Wrap one or more `glob()` loaders so the union of their files defines the
 * collection, and so stale entries from previous configurations never leak
 * across runs.
 *
 * Two issues in Astro's stock `glob()` motivate this wrapper:
 *
 *   1. When the directory matches zero files, `glob()` early-returns without
 *      pruning the store (see node_modules/astro/dist/content/loaders/glob.js
 *      line 180). Toggling `HYPERTEXT_INCLUDE_FIXTURES` between runs would
 *      otherwise leave fixture entries persisted in `node_modules/.astro/
 *      data-store.json` — the public build would then try to render
 *      `/notes/2026-04-08-on-finishing` whose source file isn't reachable.
 *
 *   2. Each delegated `glob()` thinks it owns the entire collection and
 *      prunes any entry it didn't touch. Two sources back-to-back: the
 *      second's pruning deletes everything the first just added.
 *
 * The fix: own pruning here. Clear the collection's store first (defeats #1),
 * then stub `store.delete` while the delegated loaders run (defeats #2),
 * then restore the real delete. Final state = union of all sources' files.
 *
 * If the same id appears in multiple bases, last source wins. With our
 * setup (public dir + fixtures), that means a fixture can shadow a public
 * entry — fine, since fixtures only exist in test runs.
 */
function mergedGlob(bases: string[], pattern: string): LoaderLike {
  const sources = bases.map((base) => glob({ pattern, base }));
  return {
    name: 'merged-glob',
    async load(ctx) {
      ctx.store.clear();
      const realDelete = ctx.store.delete.bind(ctx.store);
      ctx.store.delete = () => true;
      try {
        for (const source of sources) await source.load(ctx);
      } finally {
        ctx.store.delete = realDelete;
      }
    },
  } as LoaderLike;
}

function studiesLoader(): LoaderLike {
  const bases = ['./src/content/studies'];
  if (includeFixtures) bases.push('./tests/fixtures/content/studies');
  return mergedGlob(bases, '**/*.{md,mdx}');
}

function notesLoader(): LoaderLike {
  const bases = ['./src/content/notes'];
  if (includeFixtures) bases.push('./tests/fixtures/content/notes');
  return mergedGlob(bases, '**/*.{md,mdx}');
}

const studies = defineCollection({
  loader: studiesLoader(),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.coerce.date(),
    modifiedAt: z.coerce.date().optional(),
    author: z.string().default('Hypertext Studio'),
    product: z.enum(['docket', 'logdate', 'curfew', 'termsly']).optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
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
