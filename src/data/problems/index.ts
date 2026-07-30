import type { Problem } from '../../types';
import { fail, mustMatch, mustNotMatch, pass, runChecks, runJsTests } from '../../engine/validator';
import { generalPrinciplesProblems } from './general-principles';
import { softwareDesignProblems } from './software-design';
import { phpProblems } from './php';
import { javascriptProblems } from './javascript';
import { securityProblems } from './security';

export const allProblems: Problem[] = [
  ...generalPrinciplesProblems,
  ...softwareDesignProblems,
  ...phpProblems,
  ...javascriptProblems,
  ...securityProblems,
];

export function getProblemsByCategory(categoryId: string): Problem[] {
  return allProblems.filter((p) => p.category === categoryId);
}

export function getProblemById(id: string): Problem | undefined {
  return allProblems.find((p) => p.id === id);
}

export function getVariantProblem(problem: Problem, variantId: string): {
  starterCode: string;
  title: string;
  description: string;
  hints: string[];
} {
  if (variantId === 'default') {
    return {
      starterCode: problem.starterCode,
      title: problem.title,
      description: problem.description,
      hints: problem.hints,
    };
  }

  const variant = problem.variants.find((v) => v.id === variantId);
  if (!variant) {
    return {
      starterCode: problem.starterCode,
      title: problem.title,
      description: problem.description,
      hints: problem.hints,
    };
  }
  return {
    starterCode: variant.starterCode,
    title: variant.title,
    description: variant.description,
    hints: variant.hints ?? problem.hints,
  };
}

export function pickRetryVariant(problem: Problem, currentVariantId: string): string {
  const pool = ['default', ...problem.variants.map((v) => v.id)];
  const candidates = pool.filter((id) => id !== currentVariantId);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 'default';
}

// Re-export helpers used in problem files
export { fail, mustMatch, mustNotMatch, pass, runChecks, runJsTests };
