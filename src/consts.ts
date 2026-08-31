export const SITE_URL = 'https://hypertext.studio';
export const SITE_NAME = 'Hypertext Studio';
export const SITE_LOCALE = 'en';
export const SITE_DIR = 'ltr';

export const STUDIO_LOCATION = {
  street: '1810 East Sahara Avenue, STE 75246',
  locality: 'Las Vegas',
  region: 'NV',
  postalCode: '89104',
  country: 'US',
  timezone: 'America/Los_Angeles',
} as const;

export const STUDIO_EMAIL = 'hello@hypertext.studio';

export const SOCIAL = {
  github: 'https://github.com/TheHypertextStudio',
  githubRepo: 'https://github.com/TheHypertextStudio/website',
  bluesky: blueskyProfileUrl(import.meta.env.BLUESKY_HANDLE),
  fediverse: 'https://fed.brid.gy/r/https://hypertext.studio/',
  twitter: 'https://twitter.com/hypertextstudio',
} as const;

export const PRODUCT_DOMAINS = ['logdate.app', 'curfew.app', 'termsly.com'] as const;
import { blueskyProfileUrl } from '@/lib/social';
