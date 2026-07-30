export type ProblemLanguage = 'javascript' | 'php' | 'sql' | 'markdown' | 'css';

export interface RuleInfo {
  id: string;
  category: string;
  title: string;
  summary: string;
  why: string;
  whyNot: string;
}

export interface ProblemVariant {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  hints?: string[];
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

export interface Problem {
  id: string;
  ruleId: string;
  category: string;
  title: string;
  description: string;
  language: ProblemLanguage;
  starterCode: string;
  hints: string[];
  explanation: {
    why: string;
    whyNot: string;
    correctApproach: string;
    commonMistakes: string[];
  };
  variants: ProblemVariant[];
  validate: (code: string) => ValidationResult;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ProgressState {
  completed: Record<string, boolean>;
  attempts: Record<string, number>;
  lastVariant: Record<string, string>;
}
