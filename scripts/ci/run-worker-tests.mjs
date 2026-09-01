#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  appendSummary,
  escapeMarkdownCell,
  formatDuration,
  isEntryPoint,
  outcomeLabel,
} from './report.mjs';

const WORKERS = ['www', 'poem', 'webmention', 'micropub', 'oembed'];

const configFor = (name) => `tests/workers/configs/${name}.config.ts`;

// Aggregate key -> Vitest JSON report field. The totals seed is derived from
// this map plus durationMs, so the two key lists cannot drift apart.
const COUNT_FIELDS = {
  failedFiles: 'numFailedTestSuites',
  failedTests: 'numFailedTests',
  passedFiles: 'numPassedTestSuites',
  passedTests: 'numPassedTests',
  pendingTests: 'numPendingTests',
  totalFiles: 'numTotalTestSuites',
  totalTests: 'numTotalTests',
};

const SUMMED_KEYS = ['durationMs', ...Object.keys(COUNT_FIELDS)];

function reportNumbers(report) {
  return Object.fromEntries(
    Object.entries(COUNT_FIELDS).map(([key, field]) => [key, report?.[field] ?? 0]),
  );
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

  const totals = Object.fromEntries(SUMMED_KEYS.map((key) => [key, 0]));
  for (const row of rows) {
    for (const key of SUMMED_KEYS) totals[key] += row[key];
  }

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
    for (const name of WORKERS) {
      const reportPath = join(reportDirectory, `${name}.json`);
      const startedAt = Date.now();
      const child = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          configFor(name),
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

if (isEntryPoint(import.meta.url)) {
  runWorkerTests()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
