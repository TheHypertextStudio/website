#!/usr/bin/env node

import { appendFile, readdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const OUTCOME_LABELS = {
  success: '✅ Passed',
  failure: '❌ Failed',
  cancelled: '⏹️ Cancelled',
  skipped: '⏭️ Skipped',
};

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

export function outcomeLabel(outcome) {
  return OUTCOME_LABELS[outcome] ?? '➖ Not run';
}

export function renderOutcomeTable(title, rows) {
  const lines = [`## ${title}`, '', '| Check | Result | Details |', '| --- | --- | --- |'];

  for (const row of rows) {
    lines.push(
      `| ${escapeMarkdownCell(row.name)} | ${outcomeLabel(row.outcome)} | ${escapeMarkdownCell(row.details || '—')} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

async function walkFiles(root, relative = '') {
  const directory = resolve(root, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walkFiles(root, childRelative)));
    else if (entry.isFile()) files.push(childRelative);
  }

  return files;
}

export async function collectBuildStats(root) {
  const files = await walkFiles(root);
  let bytes = 0;

  for (const file of files) bytes += (await stat(resolve(root, file))).size;

  return {
    bytes,
    files: files.length,
    htmlPages: files.filter((file) => file.endsWith('.html')).length,
    wellKnownFiles: files.filter((file) => file.startsWith('.well-known/')).length,
  };
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
  let stats;
  if (options.buildOutcome === 'success') stats = await collectBuildStats(options.distDir);

  const markdown = renderOutcomeTable('Build report', [
    {
      name: 'Production build',
      outcome: options.buildOutcome,
      details: stats
        ? `${countLabel(stats.htmlPages, 'HTML page')} · ${countLabel(stats.files, 'file')} · ${formatBytes(stats.bytes)}`
        : 'No deployable artifact was produced',
    },
    {
      name: 'Artifact upload',
      outcome: options.uploadOutcome,
      details: stats
        ? options.uploadOutcome === 'success'
          ? `${countLabel(stats.wellKnownFiles, '.well-known file')} included`
          : `Upload did not complete; ${countLabel(stats.wellKnownFiles, '.well-known file')} ${stats.wellKnownFiles === 1 ? 'was' : 'were'} present`
        : 'Not available',
    },
  ]);

  return `${markdown}\n- Artifact: \`${escapeMarkdownCell(options.artifactName)}\`\n- Artifact URL: ${options.artifactUrl || 'Not available'}\n- SHA-256: ${options.artifactDigest ? `\`${escapeMarkdownCell(options.artifactDigest)}\`` : 'Not available'}\n- Retention: ${escapeMarkdownCell(options.retentionDays)} days\n`;
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

export function renderProductionReport(outcomes, smokeRows = []) {
  const stages = [
    { name: 'D1 migrations', outcome: outcomes.migration },
    { name: 'Worker: www', outcome: outcomes.www },
    { name: 'Worker: poem', outcome: outcomes.poem },
    { name: 'Worker: webmention', outcome: outcomes.webmention },
    { name: 'Worker: micropub', outcome: outcomes.micropub },
    { name: 'Worker: oEmbed', outcome: outcomes.oembed },
    { name: 'Pages', outcome: outcomes.pages },
    { name: 'Production smoke', outcome: outcomes.smoke },
  ];
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

export function renderWorkflowReport(data) {
  const shortSha = data.sha ? data.sha.slice(0, 7) : 'unknown';
  const productionDetails =
    data.eventName === 'pull_request' && data.production === 'skipped'
      ? 'Not requested for pull requests'
      : data.production === 'skipped'
        ? 'Not attempted because an upstream gate did not pass'
        : data.production === 'success'
          ? 'Deployed to https://hypertext.studio'
          : data.production === 'failure'
            ? 'Deployment did not complete'
            : data.production === 'cancelled'
              ? 'Deployment was cancelled'
              : 'Not run';
  const rows = [
    { name: 'Quality', outcome: data.quality },
    { name: 'Tests', outcome: data.test },
    { name: 'Browsers and accessibility', outcome: data.browser },
    { name: 'Build', outcome: data.build },
    {
      name: 'Production',
      outcome: data.production,
      details: productionDetails,
    },
  ];
  const lines = [
    '## Workflow receipt',
    '',
    `**Commit:** \`${escapeMarkdownCell(shortSha)}\` · **Ref:** \`${escapeMarkdownCell(data.refName || 'unknown')}\` · **Event:** \`${escapeMarkdownCell(data.eventName || 'unknown')}\` · **Actor:** @${escapeMarkdownCell(data.actor || 'unknown')}`,
    '',
    renderOutcomeTable('Run results', rows).replace('## Run results\n\n', '').trimEnd(),
  ];

  if (data.eventName === 'pull_request' && data.production === 'skipped') {
    lines.push('', 'Production was not requested for this pull request.');
  } else if (data.production === 'success') {
    lines.push('', 'Production: https://hypertext.studio');
  }

  if (data.artifactUrl) lines.push(`Artifact: ${data.artifactUrl}`);
  if (data.artifactDigest)
    lines.push(`Artifact SHA-256: \`${escapeMarkdownCell(data.artifactDigest)}\``);

  return `${lines.join('\n')}\n`;
}

export function renderQualityReport(outcomes) {
  return renderOutcomeTable('Quality report', [
    { name: 'Formatting', outcome: outcomes.format },
    { name: 'ESLint and Astro', outcome: outcomes.lint },
    { name: 'Application types', outcome: outcomes.typecheck },
    { name: 'Worker types', outcome: outcomes.workerTypecheck },
  ]);
}

export function renderCodeqlReport(outcomes) {
  const phases = [outcomes.init, outcomes.analyze];
  const overall = phases.includes('failure')
    ? 'failure'
    : phases.includes('cancelled')
      ? 'cancelled'
      : phases.every((phase) => phase === 'success')
        ? 'success'
        : phases.includes('skipped')
          ? 'skipped'
          : '';
  const table = renderOutcomeTable('CodeQL report', [
    { name: 'Initialize', outcome: outcomes.init, details: outcomes.language },
    { name: 'Analyze and upload', outcome: outcomes.analyze, details: outcomes.language },
  ]);

  return table.replace(
    '## CodeQL report\n\n',
    `## CodeQL report\n\n**Overall:** ${outcomeLabel(overall)}\n\n`,
  );
}

export async function appendSummary(markdown, environment = process.env) {
  const destination = environment.GITHUB_STEP_SUMMARY;
  if (!destination) {
    process.stdout.write(markdown);
    return;
  }
  await appendFile(destination, markdown, 'utf8');
}

async function runCli(mode, environment = process.env) {
  if (mode === 'quality') {
    return appendSummary(
      renderQualityReport({
        format: environment.FORMAT_RESULT,
        lint: environment.LINT_RESULT,
        typecheck: environment.TYPECHECK_RESULT,
        workerTypecheck: environment.WORKER_TYPECHECK_RESULT,
      }),
      environment,
    );
  }

  if (mode === 'build') {
    return appendSummary(
      await renderBuildReport({
        artifactDigest: environment.ARTIFACT_DIGEST || '',
        artifactName: environment.ARTIFACT_NAME || 'Not available',
        artifactUrl: environment.ARTIFACT_URL || '',
        buildOutcome: environment.BUILD_RESULT,
        distDir: environment.DIST_DIR || 'dist',
        retentionDays: environment.ARTIFACT_RETENTION_DAYS || '7',
        uploadOutcome: environment.UPLOAD_RESULT,
      }),
      environment,
    );
  }

  if (mode === 'production') {
    let smokeRows = [];
    if (environment.SMOKE_REPORT_FILE) {
      try {
        smokeRows = parseSmokeReport(await readFile(environment.SMOKE_REPORT_FILE, 'utf8'));
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    return appendSummary(
      renderProductionReport(
        {
          migration: environment.MIGRATION_RESULT,
          micropub: environment.MICROPUB_RESULT,
          oembed: environment.OEMBED_RESULT,
          pages: environment.PAGES_RESULT,
          poem: environment.POEM_RESULT,
          smoke: environment.SMOKE_RESULT,
          webmention: environment.WEBMENTION_RESULT,
          www: environment.WWW_RESULT,
        },
        smokeRows,
      ),
      environment,
    );
  }

  if (mode === 'workflow') {
    return appendSummary(
      renderWorkflowReport({
        actor: environment.RUN_ACTOR,
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
      environment,
    );
  }

  if (mode === 'codeql') {
    return appendSummary(
      renderCodeqlReport({
        analyze: environment.ANALYZE_RESULT,
        init: environment.INIT_RESULT,
        language: environment.CODEQL_LANGUAGE || 'unknown',
      }),
      environment,
    );
  }

  throw new Error(`Unknown report mode: ${mode || '<missing>'}`);
}

const entryPoint = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryPoint && fileURLToPath(import.meta.url) === entryPoint) {
  runCli(process.argv[2]).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
