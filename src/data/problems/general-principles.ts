import type { Problem } from '../../types';
import { fail, mustMatch, mustNotMatch, pass, runChecks, runJsTests } from '../../engine/validator';

export const generalPrinciplesProblems: Problem[] = [
  {
    id: 'gp-simple-readability-1',
    ruleId: 'gp-simple-readability',
    category: 'general-principles',
    title: 'Calculate cart total clearly',
    description:
      'Refactor `calculateTotal` so it is easy to read. Avoid nested optional chaining and reduce one-liners that hide the business rule.',
    language: 'javascript',
    starterCode: `function calculateTotal(items) {
  return items.reduce((a, i) => a + (i?.p?.d ?? 0) * (i?.q ?? 1), 0);
}

module.exports = { calculateTotal };`,
    hints: [
      'Use a for...of loop with explicit property names.',
      'Name price and quantity instead of single-letter keys.',
    ],
    explanation: {
      why: 'Explicit loops document that total = sum of price × quantity for each item.',
      whyNot: 'Nested optional chaining in reduce hides which fields matter and what happens when they are missing.',
      correctApproach: 'Loop items, multiply price by quantity, accumulate into a total variable.',
      commonMistakes: [
        'Keeping reduce but only renaming variables — still too clever.',
        'Using nested ternaries instead of a clear loop.',
      ],
    },
    variants: [
      {
        id: 'gp-simple-readability-v2',
        title: 'Average rating without clever reduce',
        description:
          'Rewrite `averageRating` using a simple loop instead of a dense one-liner.',
        starterCode: `function calculateTotal(reviews) {
  return reviews.length ? reviews.reduce((s, r) => s + (r?.score ?? 0), 0) / reviews.length : 0;
}

module.exports = { calculateTotal };`,
      },
      {
        id: 'gp-simple-readability-v3',
        title: 'Count active users readably',
        description:
          'Replace the nested filter/reduce chain with straightforward iteration.',
        starterCode: `function calculateTotal(users) {
  return users.filter(u => u?.status?.code === 'A').reduce((n, _) => n + 1, 0);
}

module.exports = { calculateTotal };`,
      },
    ],
    validate(code) {
      const noDenseReduce = mustNotMatch(
        code,
        /reduce\s*\(\s*\([^)]*\)\s*=>\s*[^;]*\?\./,
        'Avoid reduce with nested optional chaining — use an explicit loop.',
      );
      if (noDenseReduce) return noDenseReduce;

      return runJsTests(code, [
        {
          name: 'sums price × quantity',
          run: (exp) => {
            const fn = exp.calculateTotal as (items: { price: number; quantity: number }[]) => number;
            const result = fn([
              { price: 10, quantity: 2 },
              { price: 5, quantity: 1 },
            ]);
            if (result !== 25) throw new Error(`Expected 25, got ${result}`);
          },
        },
        {
          name: 'handles empty cart',
          run: (exp) => {
            const fn = exp.calculateTotal as (items: unknown[]) => number;
            if (fn([]) !== 0) throw new Error('Empty cart should total 0');
          },
        },
      ]);
    },
  },
  {
    id: 'gp-edge-cases-1',
    ruleId: 'gp-edge-cases',
    category: 'general-principles',
    title: 'Safe first item name',
    description:
      'Fix `firstItemName` so it handles an empty array without throwing. Return null when there is no first item.',
    language: 'javascript',
    starterCode: `function firstItemName(items) {
  return items[0].name;
}

module.exports = { firstItemName };`,
    hints: ['Check array length before indexing.', 'Return null for an empty array.'],
    explanation: {
      why: 'Empty collections are valid inputs; accessing index 0 without a guard throws.',
      whyNot: 'Assuming at least one item causes runtime errors on legitimate empty results.',
      correctApproach: 'If items.length === 0, return null; otherwise return items[0].name.',
      commonMistakes: [
        'Returning empty string instead of null — changes the API contract.',
        'Only checking items[0] truthiness — misses objects with falsy names.',
      ],
    },
    variants: [
      {
        id: 'gp-edge-cases-v2',
        title: 'Safe last order id',
        description: 'Return null when orders is empty instead of crashing.',
        starterCode: `function firstItemName(orders) {
  return orders[orders.length - 1].id;
}

module.exports = { firstItemName };`,
      },
      {
        id: 'gp-edge-cases-v3',
        title: 'Headline from articles list',
        description: 'Guard against an empty articles array before reading the headline.',
        starterCode: `function firstItemName(articles) {
  return articles[0].headline;
}

module.exports = { firstItemName };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /\.length|===\s*\[\]|length\s*===\s*0|!items\.length|!orders\.length|!articles\.length/, 'Add an explicit empty-array guard.'),
        () => mustMatch(code, /null/, 'Return null when the collection is empty.'),
        () => {
          const hasGuard = /\.length|===\s*\[\]/.test(code);
          if (!hasGuard) return fail('Add an empty-collection guard.');
          return pass('Edge case guard looks correct.');
        },
      ]);
    },
  },
  {
    id: 'gp-dead-code-1',
    ruleId: 'gp-dead-code',
    category: 'general-principles',
    title: 'Remove dead imports and comments',
    description:
      'Clean up `computeInvoiceTotal`: remove unused imports, commented-out code, and unused variables. Keep only what the function needs.',
    language: 'javascript',
    starterCode: `import { unusedHelper, formatCurrency } from './helpers';
// const oldTotal = computeLegacyTotal(items);
const discountRate = 0.1; // never used

function computeInvoiceTotal(items) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  return formatCurrency(subtotal);
}

module.exports = { computeInvoiceTotal };`,
    hints: [
      'Delete imports that are not referenced.',
      'Remove commented-out legacy code and unused constants.',
    ],
    explanation: {
      why: 'Dead code obscures what the function actually does and invites copy-paste resurrection of obsolete logic.',
      whyNot: 'Leaving unused imports and commented blocks suggests the change is unfinished.',
      correctApproach: 'Keep only formatCurrency import and the loop that computes subtotal.',
      commonMistakes: [
        'Removing the business logic while cleaning comments.',
        'Leaving discountRate because it might be used later (YAGNI applies).',
      ],
    },
    variants: [
      {
        id: 'gp-dead-code-v2',
        title: 'Trim unused logger',
        description: 'Remove the unused logger import and commented debug block.',
        starterCode: `import { createLogger } from './logger';

function computeInvoiceTotal(items) {
  // console.log('debug', items);
  return items.reduce((sum, e) => sum + e.price * e.quantity, 0);
}

module.exports = { computeInvoiceTotal };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /unusedHelper/, 'Remove the unused import.'),
        () => mustNotMatch(code, /computeLegacyTotal|oldTotal/, 'Remove commented-out legacy code.'),
        () => {
          if (/discountRate/.test(code)) {
            return fail('Remove the unused discountRate variable.');
          }
          if (/createLogger/.test(code)) {
            return fail('Remove the unused createLogger import.');
          }
          if (/console\.log\s*\(\s*['"]debug/.test(code)) {
            return fail('Remove commented debug console.log lines.');
          }
          return null;
        },
        () => mustMatch(code, /formatCurrency|reduce|price/, 'Keep the working business logic.'),
      ]);
    },
  },
  {
    id: 'gp-n-plus-one-1',
    ruleId: 'gp-n-plus-one',
    category: 'general-principles',
    title: 'Batch outcome lookups',
    description:
      'Fix the N+1 pattern: collect unique outcome strings, call `lookupOutcomes` once with all keys, then map inside the loop.',
    language: 'javascript',
    starterCode: `const outcomeTable = {
  pass: 'PASSED',
  fail: 'FAILED',
  withdraw: 'WITHDRAWN',
};

function lookupOutcomes(keys) {
  const map = {};
  for (const key of keys) {
    map[key] = outcomeTable[key] ?? 'UNKNOWN';
  }
  return map;
}

function mapRegistrationOutcomes(rows) {
  const result = {};
  for (const row of rows) {
    const outcome = lookupOutcomes([row.outcome])[row.outcome];
    result[row.id] = outcome;
  }
  return result;
}

module.exports = { mapRegistrationOutcomes, lookupOutcomes };`,
    hints: [
      'Gather unique outcome strings before the loop.',
      'Call lookupOutcomes once with all distinct keys.',
    ],
    explanation: {
      why: 'One batch query (or lookup) for all distinct keys scales; per-row calls multiply work by row count.',
      whyNot: 'Calling lookupOutcomes inside the loop repeats work even when many rows share the same outcome.',
      correctApproach: 'Build a Set or object of unique keys, batch lookup once, index the map in the loop.',
      commonMistakes: [
        'Caching inside the loop with ??= — still one call per distinct key instead of one batch call.',
        'Hoisting only when all rows share one outcome — still need batching for mixed outcomes.',
      ],
    },
    variants: [
      {
        id: 'gp-n-plus-one-v2',
        title: 'Batch user label resolution',
        description:
          'Resolve user labels in one batch call to `fetchLabels` instead of per row inside the loop.',
        starterCode: `const outcomeTable = { pass: 'PASSED', fail: 'FAILED' };

function lookupOutcomes(keys) {
  const map = {};
  for (const key of keys) map[key] = outcomeTable[key] ?? 'UNKNOWN';
  return map;
}

function mapRegistrationOutcomes(rows) {
  const result = {};
  for (const row of rows) {
    result[row.id] = lookupOutcomes([row.userId ?? row.outcome])[row.userId ?? row.outcome];
  }
  return result;
}

module.exports = { mapRegistrationOutcomes, lookupOutcomes };`,
      },
    ],
    validate(code) {
      const batchBeforeLoop = mustMatch(
        code,
        /(unique|distinct|keys|Set|Object\.keys)[\s\S]*lookupOutcomes[\s\S]*for\s*\(/,
        'Collect unique keys and call lookupOutcomes once before the loop.',
      );
      if (batchBeforeLoop) return batchBeforeLoop;

      const noPerRowLookup = mustNotMatch(
        code,
        /for\s*\([^)]*\)\s*\{[\s\S]*lookupOutcomes\s*\(\s*\[/,
        'Do not call lookupOutcomes with a single-element array inside the loop.',
      );
      if (noPerRowLookup) return noPerRowLookup;

      return runJsTests(code, [
        {
          name: 'maps outcomes correctly',
          run: (exp) => {
            const fn = exp.mapRegistrationOutcomes as (
              rows: { id: string; outcome: string }[],
            ) => Record<string, string>;
            const result = fn([
              { id: 'a', outcome: 'pass' },
              { id: 'b', outcome: 'fail' },
              { id: 'c', outcome: 'pass' },
            ]);
            if (result.a !== 'PASSED' || result.b !== 'FAILED') {
              throw new Error('Incorrect mapping');
            }
          },
        },
      ]);
    },
  },
];
