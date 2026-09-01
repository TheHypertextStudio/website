import { describe, expect, test } from 'vitest';

import { aggregateVitestReports, renderWorkerSummary } from '../../scripts/ci/run-worker-tests.mjs';

describe('Worker test report', () => {
  test('aggregates every Worker suite and retains a failing exit status', () => {
    const aggregate = aggregateVitestReports([
      {
        durationMs: 425,
        exitCode: 0,
        name: 'www',
        report: {
          numFailedTestSuites: 0,
          numFailedTests: 0,
          numPassedTestSuites: 1,
          numPassedTests: 1,
          numPendingTests: 0,
          numTotalTestSuites: 1,
          numTotalTests: 1,
        },
      },
      {
        durationMs: 1_250,
        exitCode: 1,
        name: 'poem',
        report: {
          numFailedTestSuites: 1,
          numFailedTests: 1,
          numPassedTestSuites: 0,
          numPassedTests: 1,
          numPendingTests: 1,
          numTotalTestSuites: 1,
          numTotalTests: 3,
        },
      },
    ]);

    expect(aggregate.failed).toBe(true);
    expect(aggregate.totals).toEqual({
      durationMs: 1_675,
      failedFiles: 1,
      failedTests: 1,
      passedFiles: 1,
      passedTests: 2,
      pendingTests: 1,
      totalFiles: 2,
      totalTests: 4,
    });
  });

  test('renders one table and marks a missing JSON report as failed', () => {
    const aggregate = aggregateVitestReports([
      { durationMs: 50, exitCode: 1, name: 'micropub', report: null },
    ]);
    const markdown = renderWorkerSummary(aggregate);

    expect(markdown).toContain('| micropub | ❌ Failed | 0/0 | 0 | 0 | 0 | 50ms |');
    expect(markdown).toContain('**Overall:** ❌ Failed');
    expect(markdown).not.toContain('undefined');
  });
});
