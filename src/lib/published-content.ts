import type { CollectionEntry } from 'astro:content';

export function isPublishedStudy(entry: CollectionEntry<'studies'>): boolean {
  return entry.data.draft === false;
}

export async function getPublishedStudies(): Promise<CollectionEntry<'studies'>[]> {
  const { getCollection } = await import('astro:content');
  return getCollection('studies', isPublishedStudy);
}
