#!/usr/bin/env node

import { appendFile, readdir, readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const OUTCOME_LABELS = {
  success: '✅ Passed',
  failure: '❌ Failed',
  cancelled: '⏹️ Cancelled',
  skipped: '⏭️ Skipped',
};

// [row label, workflow env var] — the single source for the production stage
// list, shared by the renderer and the CLI. Same shape as a TABLE_MODES entry.
const PRODUCTION_STAGES = [
  ['Checkout', 'CHECKOUT_RESULT'],
  ['Toolchain and dependencies', 'SETUP_RESULT'],
  ['Artifact download', 'ARTIFACT_DOWNLOAD_RESULT'],
  ['D1 migrations', 'MIGRATION_RESULT'],
  ['Worker: www', 'WWW_RESULT'],
  ['Worker: poem', 'POEM_RESULT'],
  ['Worker: webmention', 'WEBMENTION_RESULT'],
  ['Worker: micropub', 'MICROPUB_RESULT'],
  ['Worker: oEmbed', 'OEMBED_RESULT'],
  ['Pages', 'PAGES_RESULT'],
  ['Production smoke', 'SMOKE_RESULT'],
];
export function escapeMarkdownCell(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll(/\r?\n/g, '<br>');
}

export function formatDuration(milliseconds) {
  if (milliseconds < 1_000) return `${Math.round(milliseconds)}ms`;

  const seconds = Math.round(milliseconds / 1_000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/** Turn [row label, env var] pairs into outcome-table rows. */
export function rowsFrom(pairs, environment) {
  return pairs.map(([name, key]) => ({ name, outcome: environment[key] }));
}

export function outcomeLabel(outcome) {
  return OUTCOME_LABELS[outcome] ?? '➖ Not run';
}

// Pass a nullish title for a bare table, or `lead` for a line between the
// heading and the table. Both exist so callers never post-process the markdown.
export function renderOutcomeTable(title, rows, { lead } = {}) {
  const lines = [];
  if (title) lines.push(`## ${title}`, '');
  if (lead) lines.push(lead, '');
  lines.push('| Check | Result | Details |', '| --- | --- | --- |');

  for (const row of rows) {
    lines.push(
      `| ${escapeMarkdownCell(row.name)} | ${outcomeLabel(row.outcome)} | ${escapeMarkdownCell(row.details || '—')} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export async function collectBuildStats(root, relative = '') {
  const directory = resolve(root, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const stats = { bytes: 0, files: 0, htmlPages: 0, wellKnownFiles: 0 };

  for (const entry of entries) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const nested = await collectBuildStats(root, childRelative);
      for (const key of Object.keys(stats)) stats[key] += nested[key];
    } else if (entry.isFile()) {
      stats.bytes += (await stat(resolve(directory, entry.name))).size;
      stats.files += 1;
      if (childRelative.endsWith('.html')) stats.htmlPages += 1;
      if (childRelative.startsWith('.well-known/')) stats.wellKnownFiles += 1;
    }
  }

  return stats;
}

function formatBytes(bytes) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KiB`;
  return `${(bytes / 1_048_576).toFixed(2)} MiB`;
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export async function renderBuildReport(options) {
  const stats =
    options.buildOutcome === 'success' ? await collectBuildStats(options.distDir) : undefined;
  const wellKnown = stats && countLabel(stats.wellKnownFiles, '.well-known file');
  const uploadDetails = !stats
    ? 'Not available'
    : options.uploadOutcome === 'success'
      ? `${wellKnown} included`
      : `Upload did not complete; ${wellKnown} ${stats.wellKnownFiles === 1 ? 'was' : 'were'} present`;

  const table = renderOutcomeTable('Build report', [
    { name: 'Checkout', outcome: options.checkoutOutcome },
    { name: 'Toolchain and dependencies', outcome: options.setupOutcome },
    {
      name: 'Production build',
      outcome: options.buildOutcome,
      details: stats
        ? `${countLabel(stats.htmlPages, 'HTML page')} · ${countLabel(stats.files, 'file')} · ${formatBytes(stats.bytes)}`
        : 'No deployable artifact was produced',
    },
    { name: 'Artifact upload', outcome: options.uploadOutcome, details: uploadDetails },
  ]);

  const footer = [
    `- Artifact: \`${escapeMarkdownCell(options.artifactName)}\``,
    `- Artifact URL: ${options.artifactUrl || 'Not available'}`,
    `- SHA-256: ${options.artifactDigest ? `\`${escapeMarkdownCell(options.artifactDigest)}\`` : 'Not available'}`,
    `- Retention: ${options.retentionDays ? `${escapeMarkdownCell(options.retentionDays)} days` : 'Not available'}`,
  ];

  return `${table}\n${footer.join('\n')}\n`;
}

export function parseSmokeReport(contents) {
  const lines = contents.trim().split(/\r?\n/);
  if (!lines[0]) return [];

  const header = lines.shift();
  if (header !== 'label\texpected\tactual\turl\tresult') {
    throw new Error('Smoke report has an unexpected header');
  }

  return lines.filter(Boolean).map((line) => {
    const [label, expected, actual, url, result] = line.split('\t');
    if (!label || !expected || !actual || !url || !result) {
      throw new Error(`Smoke report has a malformed row: ${line}`);
    }
    return { actual, expected, label, result, url };
  });
}

export function renderProductionReport(stages, smokeRows = []) {
  const lines = [renderOutcomeTable('Production report', stages).trimEnd()];

  if (smokeRows.length) {
    lines.push(
      '',
      '### Endpoint checks',
      '',
      '| Endpoint | Expected | Actual | Result | URL |',
      '| --- | ---: | ---: | --- | --- |',
    );
    for (const row of smokeRows) {
      lines.push(
        `| ${escapeMarkdownCell(row.label)} | ${escapeMarkdownCell(row.expected)} | ${escapeMarkdownCell(row.actual)} | ${outcomeLabel(row.result)} | ${escapeMarkdownCell(row.url)} |`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

const PRODUCTION_DETAILS = {
  'pr-skip': 'Not requested for pull requests',
  'off-main-skip': 'Not requested outside main',
  'gated-skip': 'Not attempted because an upstream gate did not pass',
  success: 'Deployed to https://hypertext.studio',
  failure: 'Deployment did not complete',
  cancelled: 'Deployment was cancelled',
};

const PRODUCTION_NOTES = {
  'pr-skip': 'Production was not requested for this pull request.',
  'off-main-skip': 'Production was not requested because this run did not target main.',
  success: 'Production: https://hypertext.studio',
};

// Why the production job did or did not run, as one value: the table cell and
// the prose note below it are both looked up from it so they cannot disagree.
function productionState(data) {
  if (data.production !== 'skipped') return data.production;
  if (data.eventName === 'pull_request') return 'pr-skip';
  const requested =
    data.refName === 'main' && ['push', 'workflow_dispatch'].includes(data.eventName);
  return requested ? 'gated-skip' : 'off-main-skip';
}

export function renderWorkflowReport(data) {
  const shortSha = data.sha ? data.sha.slice(0, 7) : 'unknown';
  const state = productionState(data);
  const rows = [
    { name: 'Quality', outcome: data.quality },
    { name: 'Tests', outcome: data.test },
    { name: 'Browsers and accessibility', outcome: data.browser },
    { name: 'Build', outcome: data.build },
    { name: 'Deployable artifact validation', outcome: data.artifact },
    {
      name: 'Production',
      outcome: data.production,
      details: PRODUCTION_DETAILS[state] ?? 'Not run',
    },
  ];
  const lines = [
    '## Workflow receipt',
    '',
    `**Commit:** \`${escapeMarkdownCell(shortSha)}\` · **Ref:** \`${escapeMarkdownCell(data.refName || 'unknown')}\` · **Event:** \`${escapeMarkdownCell(data.eventName || 'unknown')}\` · **Actor:** @${escapeMarkdownCell(data.actor || 'unknown')}`,
    '',
    renderOutcomeTable(null, rows).trimEnd(),
  ];

  if (PRODUCTION_NOTES[state]) lines.push('', PRODUCTION_NOTES[state]);

  if (data.artifactUrl) lines.push(`Artifact: ${data.artifactUrl}`);
  if (data.artifactDigest)
    lines.push(`Artifact SHA-256: \`${escapeMarkdownCell(data.artifactDigest)}\``);

  return `${lines.join('\n')}\n`;
}

export function renderCodeqlReport(outcomes) {
  const phases = [outcomes.init, outcomes.analyze];
  const overall =
    ['failure', 'cancelled', 'skipped'].find((status) => phases.includes(status)) ??
    (phases.every((phase) => phase === 'success') ? 'success' : '');

  return renderOutcomeTable(
    'CodeQL report',
    [
      { name: 'Initialize', outcome: outcomes.init, details: outcomes.language },
      { name: 'Analyze and upload', outcome: outcomes.analyze, details: outcomes.language },
    ],
    { lead: `**Overall:** ${outcomeLabel(overall)}` },
  );
}

/** True when `importMetaUrl`'s module was invoked directly, rather than imported. */
export function isEntryPoint(importMetaUrl) {
  if (!process.argv[1]) return false;
  return pathToFileURL(resolve(process.argv[1])).href === importMetaUrl;
}

export async function appendSummary(markdown, environment = process.env) {
  const destination = environment.GITHUB_STEP_SUMMARY;
  if (!destination) {
    process.stdout.write(markdown);
    return;
  }
  await appendFile(destination, markdown, 'utf8');
}

// Gates whose whole report is one outcome table: [heading, [row label, env var]].
const TABLE_MODES = {
  quality: [
    'Quality report',
    [
      ['Checkout', 'CHECKOUT_RESULT'],
      ['Toolchain and dependencies', 'SETUP_RESULT'],
      ['Formatting', 'FORMAT_RESULT'],
      ['ESLint', 'LINT_RESULT'],
      ['Application types', 'TYPECHECK_RESULT'],
      ['Worker types', 'WORKER_TYPECHECK_RESULT'],
    ],
  ],
  test: [
    'Test gate report',
    [
      ['Checkout', 'CHECKOUT_RESULT'],
      ['Toolchain and dependencies', 'SETUP_RESULT'],
      ['Unit tests', 'UNIT_TEST_RESULT'],
      ['Worker runtime tests', 'WORKER_TEST_RESULT'],
    ],
  ],
  browser: [
    'Browser gate report',
    [
      ['Checkout', 'CHECKOUT_RESULT'],
      ['Toolchain and dependencies', 'SETUP_RESULT'],
      ['Browser installation', 'BROWSER_INSTALL_RESULT'],
      ['Browser, responsive, and accessibility tests', 'TEST_RESULT'],
    ],
  ],
  artifact: [
    'Artifact validation gate',
    [
      ['Checkout', 'CHECKOUT_RESULT'],
      ['Toolchain and dependencies', 'SETUP_RESULT'],
      ['Artifact download', 'ARTIFACT_DOWNLOAD_RESULT'],
      ['Chromium installation', 'BROWSER_INSTALL_RESULT'],
      ['Deployable artifact tests', 'TEST_RESULT'],
    ],
  ],
};

/** Render one table-only gate from TABLE_MODES. */
export function renderTableMode(mode, environment) {
  const [title, pairs] = TABLE_MODES[mode];
  return renderOutcomeTable(title, rowsFrom(pairs, environment));
}

const MODES = {
  ...Object.fromEntries(
    Object.keys(TABLE_MODES).map((mode) => [mode, (env) => renderTableMode(mode, env)]),
  ),

  build: (environment) =>
    renderBuildReport({
      artifactDigest: environment.ARTIFACT_DIGEST || '',
      artifactName: environment.ARTIFACT_NAME || 'Not available',
      artifactUrl: environment.ARTIFACT_URL || '',
      buildOutcome: environment.BUILD_RESULT,
      checkoutOutcome: environment.CHECKOUT_RESULT,
      distDir: environment.DIST_DIR || 'dist',
      retentionDays: environment.ARTIFACT_RETENTION_DAYS || '',
      setupOutcome: environment.SETUP_RESULT,
      uploadOutcome: environment.UPLOAD_RESULT,
    }),

  production: async (environment) => {
    let smokeRows = [];
    if (environment.SMOKE_REPORT_FILE) {
      try {
        smokeRows = parseSmokeReport(await readFile(environment.SMOKE_REPORT_FILE, 'utf8'));
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    return renderProductionReport(rowsFrom(PRODUCTION_STAGES, environment), smokeRows);
  },

  workflow: (environment) =>
    renderWorkflowReport({
      actor: environment.RUN_ACTOR,
      artifact: environment.ARTIFACT_RESULT,
      artifactDigest: environment.ARTIFACT_DIGEST || '',
      artifactUrl: environment.ARTIFACT_URL || '',
      browser: environment.BROWSER_RESULT,
      build: environment.BUILD_RESULT,
      eventName: environment.RUN_EVENT,
      production: environment.PRODUCTION_RESULT,
      quality: environment.QUALITY_RESULT,
      refName: environment.RUN_REF,
      sha: environment.RUN_SHA,
      test: environment.TEST_RESULT,
    }),

  codeql: (environment) =>
    renderCodeqlReport({
      analyze: environment.ANALYZE_RESULT,
      init: environment.INIT_RESULT,
      language: environment.CODEQL_LANGUAGE || 'unknown',
    }),
};

async function runCli(mode, environment = process.env) {
  const render = MODES[mode];
  if (!render) throw new Error(`Unknown report mode: ${mode || '<missing>'}`);
  return appendSummary(await render(environment), environment);
}

if (isEntryPoint(import.meta.url)) {
  runCli(process.argv[2]).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
