import type { Problem } from '../../types';
import { mustMatch, mustNotMatch, runChecks, runJsTests } from '../../engine/validator';

export const javascriptProblems: Problem[] = [
  {
    id: 'js-const-let-1',
    ruleId: 'js-const-let',
    category: 'javascript',
    title: 'Replace var with const and let',
    description:
      'Refactor the loop to use const/let instead of var, and iterate with for...of where appropriate.',
    language: 'javascript',
    starterCode: `function sumPrices(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

module.exports = { sumPrices };`,
    hints: ['Use let for total.', 'Use for...of to iterate items directly.'],
    explanation: {
      why: 'Block-scoped const/let prevent hoisting bugs; for...of reads intent clearly.',
      whyNot: 'var in loops leaks to outer scope and causes classic closure issues.',
      correctApproach: 'let total = 0; for (const item of items) { total += item.price; }',
      commonMistakes: ['Switching to let but keeping index loop unnecessarily.', 'Using var for total only.'],
    },
    variants: [
      {
        id: 'js-const-let-v2',
        title: 'Modernize countActive',
        description: 'Remove var and use const/let with for...of.',
        starterCode: `function sumPrices(products) {
  var total = 0;
  for (var j = 0; j < products.length; j++) {
    total += products[j].price;
  }
  return total;
}

module.exports = { sumPrices };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /\bvar\b/, 'Do not use var.'),
        () => mustMatch(code, /for\s*\(\s*const\s+\w+\s+of/, 'Use for...of iteration.'),
        () => {
          return runJsTests(code, [
            {
              name: 'sums prices',
              run: (exp) => {
                const fn = exp.sumPrices as (items: { price: number }[]) => number;
                if (fn([{ price: 3 }, { price: 7 }]) !== 10) throw new Error('Wrong sum');
              },
            },
          ]);
        },
      ]);
    },
  },
  {
    id: 'js-for-of-1',
    ruleId: 'js-for-of',
    category: 'javascript',
    title: 'Replace for...in on arrays',
    description:
      'for...in iterates keys (including prototypes). Use for...of with braces to log each item name.',
    language: 'javascript',
    starterCode: `function logNames(items) {
  for (let i in items)
    console.log(items[i].name);
}

module.exports = { logNames };`,
    hints: ['Use for (const item of items) { ... }', 'Always use braces on the loop body.'],
    explanation: {
      why: 'for...of yields elements directly; braces prevent bugs when adding the next line.',
      whyNot: 'for...in on arrays iterates string keys and inherited enumerable properties.',
      correctApproach: 'for (const item of items) { console.log(item.name); }',
      commonMistakes: ['Switching to index loop without braces.', 'Using forEach when a simple for...of suffices.'],
    },
    variants: [
      {
        id: 'js-for-of-v2',
        title: 'Sum scores with for...of',
        description: 'Replace the for...in loop with for...of and braces.',
        starterCode: `function logNames(tags) {
  for (let t in tags)
    console.log(tags[t].label);
}

module.exports = { logNames };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /for\s*\([^)]*\bin\b/, 'Do not use for...in on arrays.'),
        () => mustMatch(code, /for\s*\(\s*const\s+\w+\s+of/, 'Use for...of.'),
        () => mustMatch(code, /\{\s*\n[\s\S]*\}/, 'Use braces on the loop body.'),
      ]);
    },
  },
  {
    id: 'js-no-mutation-in-getter-1',
    ruleId: 'js-no-mutation-in-getter',
    category: 'javascript',
    title: 'Split isTokenValid from deletion',
    description:
      'isTokenValid must not delete expired tokens. Make it read-only and add invalidateExpiredToken for mutation.',
    language: 'javascript',
    starterCode: `function isTokenValid(token) {
  if (token.expiresAt < Date.now()) {
    deleteToken(token);
    return false;
  }
  return true;
}

function deleteToken(token) {
  token.deleted = true;
}

module.exports = { isTokenValid, deleteToken };`,
    hints: [
      'isTokenValid should only compare expiresAt to Date.now().',
      'Add invalidateExpiredToken that deletes when invalid.',
    ],
    explanation: {
      why: 'Callers expect is* functions to be pure queries safe to call repeatedly.',
      whyNot: 'Hidden deletion breaks caching, logging, and reasoning about call order.',
      correctApproach: 'isTokenValid returns token.expiresAt >= Date.now(); separate command deletes.',
      commonMistakes: [
        'Renaming the function but keeping deletion inside.',
        'Deleting in the caller without providing a named command function.',
      ],
    },
    variants: [
      {
        id: 'js-no-mutation-v2',
        title: 'Read-only isSessionActive',
        description: 'Stop clearing sessions inside isSessionActive; add expireSession instead.',
        starterCode: `function isSessionActive(session) {
  if (session.expiresAt < Date.now()) {
    session.active = false;
    return false;
  }
  return true;
}

module.exports = { isSessionActive };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /function isTokenValid[\s\S]*deleteToken/, 'isTokenValid must not call deleteToken.'),
        () => mustMatch(code, /function invalidateExpiredToken|function expireToken/, 'Add a separate mutation function.'),
        () => mustMatch(code, /expiresAt\s*>=\s*Date\.now\(\)|Date\.now\(\)\s*<=\s*token\.expiresAt/, 'Compare expiry without side effects.'),
      ]);
    },
  },
  {
    id: 'js-strict-equality-1',
    ruleId: 'js-strict-equality',
    category: 'javascript',
    title: 'Strict equality and flat returns',
    description:
      'Fix isAdult to avoid redundant else after return, and replace == null check with explicit === null || === undefined.',
    language: 'javascript',
    starterCode: `function isAdult(age) {
  if (age >= 18) {
    return true;
  } else {
    return false;
  }
}

function isMissing(value) {
  if (value == null) {
    return true;
  }
  return false;
}

module.exports = { isAdult, isMissing };`,
    hints: [
      'After if-return true, return false without else.',
      'Use === null || value === undefined in isMissing.',
    ],
    explanation: {
      why: 'Flat early returns read linearly; strict equality documents which values are treated as missing.',
      whyNot: '== null is ambiguous in code review; else-after-return adds noise.',
      correctApproach: 'if (age >= 18) return true; return false; and explicit null/undefined checks.',
      commonMistakes: ['Using === undefined only — misses null.', 'Removing braces against standards.'],
    },
    variants: [
      {
        id: 'js-strict-v2',
        title: 'Flatten isEligible',
        description: 'Remove redundant else and use strict comparisons.',
        starterCode: `function isEligible(score) {
  if (score >= 70) {
    return true;
  } else {
    return false;
  }
}

module.exports = { isEligible };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /\}\s*else\s*\{\s*return false/, 'Remove redundant else after return.'),
        () => mustNotMatch(code, /==\s*null/, 'Do not use == null — be explicit.'),
        () => mustMatch(code, /===\s*null|===\s*undefined/, 'Use strict equality for null/undefined checks.'),
      ]);
    },
  },
  {
    id: 'js-text-content-1',
    ruleId: 'js-text-content',
    category: 'javascript',
    title: 'Use textContent for user names',
    description:
      'renderUserName assigns user input to innerHTML. Use textContent so HTML in the name cannot execute.',
    language: 'javascript',
    starterCode: `function renderUserName(element, name) {
  element.innerHTML = name;
}

module.exports = { renderUserName };`,
    hints: ['Assign with element.textContent = name.'],
    explanation: {
      why: 'textContent treats input as plain text — angle brackets display literally, scripts do not run.',
      whyNot: 'innerHTML parses markup; a name like <img onerror=alert(1)> becomes active HTML.',
      correctApproach: 'element.textContent = name;',
      commonMistakes: [
        'Using innerText when textContent is sufficient.',
        'Sanitizing with a regex instead of using textContent.',
      ],
    },
    variants: [
      {
        id: 'js-text-content-v2',
        title: 'Safe comment preview',
        description: 'Display comment body as plain text, not HTML.',
        starterCode: `function showComment(previewEl, body) {
  previewEl.innerHTML = body;
}

module.exports = { showComment };`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /\.innerHTML\s*=/, 'Do not assign user input to innerHTML.'),
        () => mustMatch(code, /\.textContent\s*=/, 'Use textContent for plain text.'),
      ]);
    },
  },
];
