import { escapeMarkdownCell, formatDuration, outcomeLabel, appendSummary } from './report.mjs';

export function renderPlaywrightSummary(tests, result) {
  const projects = new Map();

  for (const test of tests) {
    const counts = projects.get(test.project) ?? {
      failed: 0,
      flaky: 0,
      passed: 0,
      skipped: 0,
    };
    if (test.outcome === 'expected') counts.passed += 1;
    else if (test.outcome === 'unexpected') counts.failed += 1;
    else if (test.outcome === 'flaky') counts.flaky += 1;
    else counts.skipped += 1;
    projects.set(test.project, counts);
  }

  const lines = [
    '## Playwright browser report',
    '',
    `**Overall:** ${outcomeLabel(result.status === 'passed' ? 'success' : result.status === 'interrupted' ? 'cancelled' : 'failure')} · **${tests.length} tests** · ${formatDuration(result.duration)}`,
    '',
    '| Browser | Passed | Failed | Flaky | Skipped | Total |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const [project, counts] of [...projects].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const total = counts.passed + counts.failed + counts.flaky + counts.skipped;
    lines.push(
      `| ${escapeMarkdownCell(project)} | ${counts.passed} | ${counts.failed} | ${counts.flaky} | ${counts.skipped} | ${total} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export default class PlaywrightSummaryReporter {
  tests = [];

  onBegin(_config, suite) {
    this.tests = suite.allTests();
  }

  async onEnd(result) {
    if (!process.env.GITHUB_STEP_SUMMARY) return;

    const records = this.tests.map((test) => ({
      outcome: test.outcome(),
      project: test.parent.project()?.name ?? 'unassigned',
    }));

    try {
      await appendSummary(renderPlaywrightSummary(records, result));
    } catch (error) {
      console.error(`Unable to write the Playwright job summary: ${error}`);
      return { status: 'failed' };
    }
  }

  printsToStdio() {
    return false;
  }
}
