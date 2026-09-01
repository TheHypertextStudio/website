/**
 * Shared constants for the Playwright suite. The site URL list and product
 * data live here so adding a route is a one-line change for every test.
 */

export const PAGES = [
  { path: '/', name: 'Home', titleIncludes: 'Hypertext Studio' },
  { path: '/about', name: 'About', titleIncludes: 'About' },
  { path: '/privacy', name: 'Privacy', titleIncludes: 'Privacy' },
  { path: '/colophon', name: 'Colophon', titleIncludes: 'Colophon' },
  { path: '/studies', name: 'Studies', titleIncludes: 'Studies' },
  { path: '/contact', name: 'Contact', titleIncludes: 'Contact' },
] as const;

// Source of truth: src/data/products.json. Keep this fixture in sync with it.
export const PRODUCTS = [
  {
    slug: 'docket',
    name: 'Docket',
    tagline: 'One tool for planning, scheduling, and tracking every kind of work.',
    url: 'https://docket.hypertext.studio',
  },
  {
    slug: 'logdate',
    name: 'LogDate',
    tagline: 'A lifelog and social journal.',
    url: 'https://logdate.app',
  },
  {
    slug: 'curfew',
    name: 'Curfew',
    tagline: 'A hard stop for your workday.',
    url: 'https://curfew.hypertext.studio',
  },
] as const;

export const STATIC_FILES = [
  { path: '/robots.txt', contentType: /text\/plain/ },
  { path: '/humans.txt', contentType: /text\/plain/ },
  { path: '/llms.txt', contentType: /text\/(plain|markdown)/ },
  { path: '/site.webmanifest', contentType: /^application\/manifest\+json/ },
  { path: '/.well-known/security.txt', contentType: /text\/plain/ },
  {
    path: '/.well-known/webfinger',
    contentType: /(application\/jrd\+json|application\/json|text\/plain)/,
  },
  {
    path: '/.well-known/host-meta',
    contentType: /(application\/xrd\+xml|application\/xml|text\/xml|text\/plain)/,
  },
  { path: '/feed.xml', contentType: /(application\/rss\+xml|application\/xml)/ },
  { path: '/atom.xml', contentType: /(application\/atom\+xml|application\/xml)/ },
  { path: '/feed.json', contentType: /(application\/feed\+json|application\/json)/ },
] as const;
