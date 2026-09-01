import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  collectBuildStats,
  escapeMarkdownCell,
  formatDuration,
  parseSmokeReport,
  renderBuildReport,
  renderCodeqlReport,
  renderOutcomeTable,
  renderProductionReport,
  renderWorkflowReport,
} from '../../scripts/ci/report.mjs';

describe('CI report rendering', () => {
  test('escapes table separators and preserves multiline details', () => {
    expect(escapeMarkdownCell('D1 | Pages\nsecond line')).toBe('D1 \\| Pages<br>second line');
  });

  test('formats durations without inventing fractional precision', () => {
    expect(formatDuration(425)).toBe('425ms');
    expect(formatDuration(65_000)).toBe('1m 5s');
    expect(formatDuration(7_260_000)).toBe('2h 1m');
  });

  test('renders success, failure, cancellation, skipped, and missing outcomes', () => {
    const markdown = renderOutcomeTable('Quality report', [
      { name: 'Format', outcome: 'success' },
      { name: 'Lint', outcome: 'failure' },
      { name: 'Types', outcome: 'cancelled' },
      { name: 'Workers', outcome: 'skipped' },
      { name: 'Setup', outcome: '' },
    ]);

    expect(markdown).toContain('| Format | ✅ Passed |');
    expect(markdown).toContain('| Lint | ❌ Failed |');
    expect(markdown).toContain('| Types | ⏹️ Cancelled |');
    expect(markdown).toContain('| Workers | ⏭️ Skipped |');
    expect(markdown).toContain('| Setup | ➖ Not run |');
  });

  test('derives build evidence from the actual artifact directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hypertext-build-report-'));
    await mkdir(join(root, 'about'), { recursive: true });
    await mkdir(join(root, '.well-known'), { recursive: true });
    await writeFile(join(root, 'index.html'), 'home');
    await writeFile(join(root, 'about/index.html'), 'about');
    await writeFile(join(root, 'app.js'), 'javascript');
    await writeFile(join(root, '.well-known/security.txt'), 'security');

    await expect(collectBuildStats(root)).resolves.toEqual({
      bytes: 27,
      files: 4,
      htmlPages: 2,
      wellKnownFiles: 1,
    });
  });

  test('does not render undefined artifact data after a failed build', async () => {
    const markdown = await renderBuildReport({
      artifactDigest: '',
      artifactName: 'site-deadbeef',
      artifactUrl: '',
      buildOutcome: 'failure',
      distDir: '/does/not/exist',
      retentionDays: '7',
      uploadOutcome: 'skipped',
    });

    expect(markdown).toContain('| Production build | ❌ Failed |');
    expect(markdown).toContain('Artifact URL: Not available');
    expect(markdown).not.toContain('undefined');
  });

  test('does not claim files were uploaded when artifact publication failed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hypertext-failed-upload-report-'));
    await mkdir(join(root, '.well-known'), { recursive: true });
    await writeFile(join(root, 'index.html'), 'home');
    await writeFile(join(root, '.well-known/security.txt'), 'security');

    const markdown = await renderBuildReport({
      artifactDigest: '',
      artifactName: 'site-deadbeef',
      artifactUrl: '',
      buildOutcome: 'success',
      distDir: root,
      retentionDays: '7',
      uploadOutcome: 'failure',
    });

    expect(markdown).toContain('Upload did not complete; 1 .well-known file was present');
    expect(markdown).not.toContain('.well-known files included');
  });

  test('parses endpoint evidence and includes it in the production report', () => {
    const smoke = parseSmokeReport(
      [
        'label\texpected\tactual\turl\tresult',
        'Homepage\t200\t200\thttps://hypertext.studio/\tsuccess',
        'Webmentions\t400\t500\thttps://hypertext.studio/webmentions\tfailure',
      ].join('\n'),
    );

    const markdown = renderProductionReport(
      {
        migration: 'success',
        oembed: 'success',
        micropub: 'success',
        pages: 'success',
        poem: 'success',
        smoke: 'failure',
        webmention: 'success',
        www: 'success',
      },
      smoke,
    );

    expect(smoke).toHaveLength(2);
    expect(markdown).toContain('| Homepage | 200 | 200 | ✅ Passed |');
    expect(markdown).toContain('| Webmentions | 400 | 500 | ❌ Failed |');
    expect(markdown).not.toContain('\n\n\n');
  });

  test('labels production as not requested on pull requests', () => {
    const markdown = renderWorkflowReport({
      actor: 'williecubed',
      artifactDigest: '',
      artifactUrl: '',
      browser: 'success',
      build: 'success',
      eventName: 'pull_request',
      production: 'skipped',
      quality: 'success',
      refName: 'feature',
      sha: '1234567890abcdef',
      test: 'success',
    });

    expect(markdown).toContain('Production was not requested for this pull request.');
    expect(markdown).toContain('`1234567`');
    expect(markdown).not.toContain('undefined');
    expect(markdown).not.toContain('\n\n\n');
  });

  test('explains an upstream-gated production skip without claiming a deployment', () => {
    const markdown = renderWorkflowReport({
      actor: 'williecubed',
      artifactDigest: '',
      artifactUrl: '',
      browser: 'failure',
      build: 'success',
      eventName: 'push',
      production: 'skipped',
      quality: 'success',
      refName: 'main',
      sha: '1234567890abcdef',
      test: 'success',
    });

    expect(markdown).toContain('Not attempted because an upstream gate did not pass');
    expect(markdown).not.toContain('Production: https://hypertext.studio');
  });

  test('does not imply production deployed when the deployment failed', () => {
    const markdown = renderWorkflowReport({
      actor: 'williecubed',
      artifactDigest: 'sha256',
      artifactUrl: 'https://github.example/artifact',
      browser: 'success',
      build: 'success',
      eventName: 'push',
      production: 'failure',
      quality: 'success',
      refName: 'main',
      sha: '1234567890abcdef',
      test: 'success',
    });

    expect(markdown).toContain('Deployment did not complete');
    expect(markdown).not.toContain('Production: https://hypertext.studio');
    expect(markdown).not.toContain('| Production | ❌ Failed | https://hypertext.studio |');
  });

  test('renders the CodeQL language, phases, and overall status', () => {
    const markdown = renderCodeqlReport({
      analyze: 'skipped',
      init: 'failure',
      language: 'javascript-typescript',
    });

    expect(markdown).toContain('**Overall:** ❌ Failed');
    expect(markdown).toContain('| Initialize | ❌ Failed | javascript-typescript |');
    expect(markdown).toContain('| Analyze and upload | ⏭️ Skipped | javascript-typescript |');
  });
});
