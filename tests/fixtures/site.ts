/**
 * Shared constants for the Playwright suite. The site URL list and product
 * data live here so adding a route is a one-line change for every test.
 */

export const PAGES = [
  { path: '/', name: 'Home', titleIncludes: 'Hypertext Studio' },
  { path: '/privacy', name: 'Privacy', titleIncludes: 'Privacy' },
  { path: '/colophon', name: 'Colophon', titleIncludes: 'Colophon' },
  { path: '/studies', name: 'Studies', titleIncludes: 'Studies' },
  { path: '/contact', name: 'Contact', titleIncludes: 'Contact' },
] as const;

// Source of truth: src/data/products.json (`url` only set when shipped) and
// docs/mission.md §4 (locked taglines). Keep this fixture in sync with both.
export const PRODUCTS = [
  {
    slug: 'logdate',
    name: 'LogDate',
    tagline: 'A better home to document and store your memories.',
    url: 'https://logdate.app',
  },
  {
    slug: 'curfew',
    name: 'Curfew',
    tagline: 'Software for the version of you that planned ahead.',
    url: '',
  },
  {
    slug: 'termsly',
    name: 'Termsly',
    tagline: "Know what you're agreeing to.",
    url: '',
  },
] as const;

export const STATIC_FILES = [
  { path: '/robots.txt', contentType: /text\/plain/ },
  { path: '/humans.txt', contentType: /text\/plain/ },
  { path: '/llms.txt', contentType: /text\/(plain|markdown)/ },
  { path: '/site.webmanifest', contentType: /^application\/manifest\+json/ },
  { path: '/.well-known/security.txt', contentType: /text\/plain/ },
  { path: '/.well-known/atproto-did', contentType: /text\/plain/ },
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

export const FOOTER_PRINCIPLES = [
  'The page is a document, not an app',
  'Native primitives over libraries',
  'Take notes from the past to inform the future',
  'Reward close attention',
  'Calm before clever',
  'Honor the platform',
  'Minimalism in service of experience',
  'Accessibility and internationalization are first-class',
] as const;
