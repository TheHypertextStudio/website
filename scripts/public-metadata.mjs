import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';

const DID_PATTERN = /^did:(?:plc:[a-z0-9]+|web:[A-Za-z0-9._:%-]+)$/;

export async function writeOptionalPublicMetadata({ publicDir, blueskyDid }) {
  const wellKnownDir = resolve(publicDir, '.well-known');
  const didPath = resolve(wellKnownDir, 'atproto-did');
  const did = blueskyDid?.trim() ?? '';

  if (!did) {
    await rm(didPath, { force: true });
    return;
  }

  if (!DID_PATTERN.test(did)) {
    throw new Error('BLUESKY_DID must be a valid did:plc or did:web value');
  }

  await mkdir(wellKnownDir, { recursive: true });
  await writeFile(didPath, `${did}\n`, { encoding: 'utf8', mode: 0o644 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const envFile of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    try {
      loadEnvFile(envFile);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  await writeOptionalPublicMetadata({
    publicDir: resolve('public'),
    blueskyDid: process.env.BLUESKY_DID,
  });
}
