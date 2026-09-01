import { mkdtemp, mkdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { writeOptionalPublicMetadata } from '../../scripts/public-metadata.mjs';

describe('writeOptionalPublicMetadata', () => {
  test('does not publish an AT Protocol identity when no DID is configured', async () => {
    const publicDir = await mkdtemp(join(tmpdir(), 'hypertext-public-'));
    await mkdir(join(publicDir, '.well-known'), { recursive: true });

    await writeOptionalPublicMetadata({ publicDir, blueskyDid: '' });

    await expect(stat(join(publicDir, '.well-known', 'atproto-did'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  test('writes a configured DID as one plain-text line', async () => {
    const publicDir = await mkdtemp(join(tmpdir(), 'hypertext-public-'));

    await writeOptionalPublicMetadata({ publicDir, blueskyDid: 'did:plc:abc123' });

    await expect(readFile(join(publicDir, '.well-known', 'atproto-did'), 'utf8')).resolves.toBe(
      'did:plc:abc123\n',
    );
  });

  test('rejects malformed DID values', async () => {
    const publicDir = await mkdtemp(join(tmpdir(), 'hypertext-public-'));
    await expect(
      writeOptionalPublicMetadata({ publicDir, blueskyDid: 'https://example.com/not-a-did' }),
    ).rejects.toThrow('BLUESKY_DID');
  });
});
