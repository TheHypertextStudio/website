import { escapeMarkdownCell, formatDuration, outcomeLabel, appendSummary } from './report.mjs';

const OUTCOME_COUNTERS = { expected: 'passed', flaky: 'flaky', unexpected: 'failed' };

function countFlaky(tests) {
  return tests.filter((test) => test.outcome === 'flaky').length;
}

export function evaluatePlaywrightOutcome(tests, result, flakeBudget = 0) {
  if (result.status === 'interrupted') return 'cancelled';
  if (result.status !== 'passed') return 'failure';
  return countFlaky(tests) > flakeBudget ? 'failure' : 'success';
}

function readFlakeBudget(environment = process.env) {
  const raw = environment.PLAYWRIGHT_FLAKE_BUDGET ?? '0';
  if (!/^\d+$/.test(raw)) throw new Error('PLAYWRIGHT_FLAKE_BUDGET must be a nonnegative integer');
  return Number(raw);
}

export function renderPlaywrightSummary(tests, result, flakeBudget = 0) {
  const projects = new Map();

  for (const test of tests) {
    const counts = projects.get(test.project) ?? {
      failed: 0,
      flaky: 0,
      passed: 0,
      skipped: 0,
    };
    counts[OUTCOME_COUNTERS[test.outcome] ?? 'skipped'] += 1;
    projects.set(test.project, counts);
  }

  const lines = [
    '## Playwright browser report',
    '',
    `**Overall:** ${outcomeLabel(evaluatePlaywrightOutcome(tests, result, flakeBudget))} · **${tests.length} tests** · ${formatDuration(result.duration)}`,
    '',
    `**Flake budget:** ${flakeBudget} allowed · ${countFlaky(tests)} observed`,
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
    const records = this.tests.map((test) => ({
      outcome: test.outcome(),
      project: test.parent.project()?.name ?? 'unassigned',
    }));

    try {
      const flakeBudget = readFlakeBudget();
      if (process.env.GITHUB_STEP_SUMMARY) {
        await appendSummary(renderPlaywrightSummary(records, result, flakeBudget));
      }
      if (evaluatePlaywrightOutcome(records, result, flakeBudget) === 'failure') {
        return { status: 'failed' };
      }
    } catch (error) {
      console.error(`Unable to write the Playwright job summary: ${error}`);
      return { status: 'failed' };
    }
  }

  printsToStdio() {
    return false;
  }
}
