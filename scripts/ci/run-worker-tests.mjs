#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { appendSummary, escapeMarkdownCell, formatDuration, outcomeLabel } from './report.mjs';

const WORKERS = [
  ['www', 'tests/workers/configs/www.config.ts'],
  ['poem', 'tests/workers/configs/poem.config.ts'],
  ['webmention', 'tests/workers/configs/webmention.config.ts'],
  ['micropub', 'tests/workers/configs/micropub.config.ts'],
  ['oembed', 'tests/workers/configs/oembed.config.ts'],
];

function reportNumbers(report) {
  return {
    failedFiles: report?.numFailedTestSuites ?? 0,
    failedTests: report?.numFailedTests ?? 0,
    passedFiles: report?.numPassedTestSuites ?? 0,
    passedTests: report?.numPassedTests ?? 0,
    pendingTests: report?.numPendingTests ?? 0,
    totalFiles: report?.numTotalTestSuites ?? 0,
    totalTests: report?.numTotalTests ?? 0,
  };
}

export function aggregateVitestReports(runs) {
  const rows = runs.map((run) => {
    const counts = reportNumbers(run.report);
    return {
      ...counts,
      durationMs: run.durationMs,
      failed: run.exitCode !== 0 || !run.report || counts.failedFiles > 0 || counts.failedTests > 0,
      name: run.name,
    };
  });

  const totals = rows.reduce(
    (sum, row) => {
      for (const key of Object.keys(sum)) sum[key] += row[key];
      return sum;
    },
    {
      durationMs: 0,
      failedFiles: 0,
      failedTests: 0,
      passedFiles: 0,
      passedTests: 0,
      pendingTests: 0,
      totalFiles: 0,
      totalTests: 0,
    },
  );

  return { failed: rows.some((row) => row.failed), rows, totals };
}

export function renderWorkerSummary(aggregate) {
  const lines = [
    '## Worker Vitest report',
    '',
    `**Overall:** ${outcomeLabel(aggregate.failed ? 'failure' : 'success')} · **${aggregate.totals.totalTests} tests** · ${formatDuration(aggregate.totals.durationMs)}`,
    '',
    '| Worker | Result | Files | Passed | Failed | Skipped | Duration |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const row of aggregate.rows) {
    lines.push(
      `| ${escapeMarkdownCell(row.name)} | ${outcomeLabel(row.failed ? 'failure' : 'success')} | ${row.passedFiles}/${row.totalFiles} | ${row.passedTests} | ${row.failedTests} | ${row.pendingTests} | ${formatDuration(row.durationMs)} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export async function runWorkerTests() {
  const reportDirectory = mkdtempSync(join(tmpdir(), 'hypertext-worker-reports-'));
  const runs = [];

  try {
    for (const [name, config] of WORKERS) {
      const reportPath = join(reportDirectory, `${name}.json`);
      const startedAt = Date.now();
      const child = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          config,
          '--reporter=default',
          '--reporter=json',
          `--outputFile=${reportPath}`,
        ],
        { cwd: process.cwd(), stdio: 'inherit' },
      );
      const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : null;
      runs.push({
        durationMs: Date.now() - startedAt,
        exitCode: child.status ?? 1,
        name,
        report,
      });
    }

    const aggregate = aggregateVitestReports(runs);
    if (process.env.GITHUB_STEP_SUMMARY) await appendSummary(renderWorkerSummary(aggregate));
    return aggregate.failed ? 1 : 0;
  } finally {
    rmSync(reportDirectory, { force: true, recursive: true });
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (entryPoint && import.meta.url === entryPoint) {
  runWorkerTests()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
