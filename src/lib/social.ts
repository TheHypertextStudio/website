export interface SocialLinkInput {
  label: string;
  rel: string;
  href?: string;
  network?: string;
}

export interface SocialLink {
  label: string;
  rel: string;
  href: string;
}

export function normalizeSocialHandle(handle: string | undefined): string | undefined {
  const normalized = handle?.trim().replace(/^@/, '');
  if (!normalized) return undefined;
  return normalized;
}

export function blueskyProfileUrl(handle: string | undefined): string | undefined {
  const normalized = normalizeSocialHandle(handle);
  if (!normalized) return undefined;
  return `https://bsky.app/profile/${encodeURIComponent(normalized)}`;
}

export function resolveSocialLinks(
  items: readonly SocialLinkInput[],
  profiles: Readonly<Record<string, string | undefined>>,
): SocialLink[] {
  return items.flatMap((item) => {
    const href = item.href ?? (item.network ? profiles[item.network] : undefined);
    return href ? [{ label: item.label, rel: item.rel, href }] : [];
  });
}

export function filterSyndicationUrls(
  urls: readonly string[],
  blueskyProfile: string | undefined,
): string[] {
  if (blueskyProfile) return [...urls];
  return urls.filter((url) => {
    try {
      return new URL(url).hostname !== 'bsky.app';
    } catch {
      return true;
    }
  });
}
