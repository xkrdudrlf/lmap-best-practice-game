import type { ValidationResult } from '../types';

export function pass(message = 'Looks good! Your solution follows the rule.'): ValidationResult {
  return { passed: true, message };
}

export function fail(message: string, details?: string[]): ValidationResult {
  return { passed: false, message, details };
}

export function mustNotMatch(code: string, pattern: RegExp, message: string): ValidationResult | null {
  if (pattern.test(code)) {
    return fail(message);
  }
  return null;
}

export function mustMatch(code: string, pattern: RegExp, message: string): ValidationResult | null {
  if (!pattern.test(code)) {
    return fail(message);
  }
  return null;
}

export function runChecks(checks: Array<() => ValidationResult | null>): ValidationResult {
  for (const check of checks) {
    const result = check();
    if (result && !result.passed) {
      return result;
    }
  }
  return pass();
}

export function runJsTests(
  code: string,
  tests: Array<{ name: string; run: (exports: Record<string, unknown>) => void }>,
): ValidationResult {
  try {
    const wrapped = `
      ${code}
      return typeof module !== 'undefined' ? module.exports : {};
    `;
    const fn = new Function(wrapped);
    const exports: Record<string, unknown> = fn() ?? {};

    const failures: string[] = [];
    for (const test of tests) {
      try {
        test.run(exports);
      } catch (err) {
        failures.push(`${test.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (failures.length > 0) {
      return fail('Some tests failed.', failures);
    }
    return pass('All tests passed!');
  } catch (err) {
    return fail(`Code could not run: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function normalizeCode(code: string): string {
  return code.replace(/\r\n/g, '\n').trim();
}
