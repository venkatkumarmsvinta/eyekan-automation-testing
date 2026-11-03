import type { FullResult, Reporter, Suite, TestCase } from '@playwright/test/reporter';
import path from 'path';

type Counts = { total: number; passed: number; failed: number; flaky: number; skipped: number };

/**
 * Prints a pass/fail table per page at the end of a run.
 * A "page" is the top-level test.describe title (e.g. "Sign in page"),
 * or the file name for tests outside any describe.
 */
export default class PageSummaryReporter implements Reporter {
  private root?: Suite;

  onBegin(_config: unknown, suite: Suite) {
    this.root = suite;
  }

  onEnd(result: FullResult) {
    if (!this.root) return;

    const groups = new Map<string, Counts>();
    for (const test of this.root.allTests()) {
      const name = pageName(test);
      const c = groups.get(name) ?? { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 };
      c.total++;
      const outcome = test.outcome();
      if (outcome === 'expected') c.passed++;
      else if (outcome === 'unexpected') c.failed++;
      else if (outcome === 'flaky') c.flaky++;
      else c.skipped++;
      groups.set(name, c);
    }

    const rows = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
    const sum = rows.reduce<Counts>(
      (s, [, c]) => ({
        total: s.total + c.total,
        passed: s.passed + c.passed,
        failed: s.failed + c.failed,
        flaky: s.flaky + c.flaky,
        skipped: s.skipped + c.skipped,
      }),
      { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 },
    );

    const header = ['Page', 'Total', 'Passed', 'Failed', 'Flaky', 'Skipped'];
    const body = rows.map(([name, c]) => [name, c.total, c.passed, c.failed, c.flaky, c.skipped].map(String));
    const footer = ['TOTAL', sum.total, sum.passed, sum.failed, sum.flaky, sum.skipped].map(String);
    const widths = header.map((h, i) => Math.max(h.length, ...[...body, footer].map((r) => r[i].length)));

    const line = (r: string[]) =>
      '│ ' + r.map((cell, i) => (i === 0 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]))).join(' │ ') + ' │';
    const sep = (l: string, m: string, r: string) => l + widths.map((w) => '─'.repeat(w + 2)).join(m) + r;

    const out = [
      '',
      'Test summary by page',
      sep('┌', '┬', '┐'),
      line(header),
      sep('├', '┼', '┤'),
      ...body.map(line),
      sep('├', '┼', '┤'),
      line(footer),
      sep('└', '┴', '┘'),
      `Overall: ${result.status.toUpperCase()}`,
      '',
    ];
    console.log(out.join('\n'));
  }

  printsToStdio() {
    return false; // let the normal line/list reporter keep printing progress
  }
}

function pageName(test: TestCase): string {
  // titlePath: ['', project, file, describe..., test]
  let suite: Suite | undefined = test.parent;
  let top: Suite | undefined;
  while (suite && suite.type === 'describe') {
    top = suite;
    suite = suite.parent;
  }
  return top?.title ?? path.basename(test.location.file).replace(/\.spec\.ts$/, '');
}
