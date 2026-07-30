import type { Problem } from '../../types';
import { mustMatch, mustNotMatch, runChecks } from '../../engine/validator';

export const securityProblems: Problem[] = [
  {
    id: 'sec-no-secrets-1',
    ruleId: 'sec-no-secrets',
    category: 'security',
    title: 'Fix the .env.example file',
    description:
      'This .env.example contains real secrets. Replace values with empty placeholders and ensure sensitive keys have no real credentials.',
    language: 'markdown',
    starterCode: `# .env.example — DO NOT commit real secrets
DATABASE_URL=postgresql://admin:SuperSecret@db:5432/app
STRIPE_SECRET=sk_live_51AbCdEfGhIjKlMn
APP_SECRET=hardcoded-production-secret-key`,
    hints: [
      'Leave keys but empty the values after =.',
      'Never include sk_live_ or real passwords in committed files.',
    ],
    explanation: {
      why: '.env.example documents required keys; real values belong in deployment secrets only.',
      whyNot: 'Git history is permanent — scanners find live keys in minutes.',
      correctApproach: 'DATABASE_URL=\\nSTRIPE_SECRET=\\nAPP_SECRET= with comments explaining injection at runtime.',
      commonMistakes: [
        'Redacting only part of the secret — rotate if ever committed.',
        'Moving secrets to another tracked file instead of env injection.',
      ],
    },
    variants: [
      {
        id: 'sec-no-secrets-v2',
        title: 'Sanitize docker env defaults',
        description: 'Remove hard-coded API keys from the example compose env section.',
        starterCode: `# compose.override.example.yaml
services:
  app:
    environment:
      OPENAI_API_KEY: sk-proj-real-key-here
      DATABASE_URL: postgres://user:password@db:5432/app`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /SuperSecret|sk_live|sk-proj-real|password@/, 'Remove real-looking secret values.'),
        () => mustNotMatch(code, /hardcoded-production-secret-key/, 'Remove hard-coded APP_SECRET value.'),
        () => mustMatch(code, /=\s*$/m, 'Use empty placeholder values (KEY=).'),
      ]);
    },
  },
  {
    id: 'sec-no-custom-crypto-1',
    ruleId: 'sec-no-custom-crypto',
    category: 'security',
    title: 'Replace custom token and password hashing',
    description:
      'Stop using md5/base64 for tokens and SHA256 for passwords. Use password_hash and a framework-style random token.',
    language: 'php',
    starterCode: `<?php

function createAuthToken(int $userId): string
{
    return base64_encode(md5($userId . 'secret_salt'));
}

function hashUserPassword(string $password): string
{
    return hash('sha256', $password);
}`,
    hints: [
      'Use bin2hex(random_bytes(32)) for tokens.',
      'Use password_hash($password, PASSWORD_DEFAULT) for passwords.',
    ],
    explanation: {
      why: 'CSPRNG tokens and password_hash use vetted algorithms with correct parameters.',
      whyNot: 'md5 and SHA256 are fast; concatenated salts are not a substitute for password hashing.',
      correctApproach: 'random_bytes for tokens; password_hash/password_verify for credentials.',
      commonMistakes: [
        'Adding more salt to md5 — still broken.',
        'Using uniqid() for tokens — predictable.',
      ],
    },
    variants: [
      {
        id: 'sec-no-custom-crypto-v2',
        title: 'Fix remember-me cookie token',
        description: 'Replace md5(userId + date) with cryptographically secure random bytes.',
        starterCode: `<?php

function rememberMeToken(int $userId): string
{
    return md5($userId . date('Y-m-d'));
}`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /random_bytes|random_int/, 'Use cryptographically secure randomness for tokens.'),
        () => mustMatch(code, /password_hash/, 'Use password_hash for passwords.'),
        () => mustNotMatch(code, /md5\s*\(|hash\s*\(\s*['"]sha256/, 'Do not use md5 or SHA256 for secrets/passwords.'),
      ]);
    },
  },
  {
    id: 'sec-error-disclosure-1',
    ruleId: 'sec-error-disclosure',
    category: 'security',
    title: 'Generic API error response',
    description:
      'The catch block returns SQLSTATE and file paths to the client. Return a generic message and keep details server-side only.',
    language: 'php',
    starterCode: `<?php

function handleCheckout(): array
{
    try {
        processPayment();
        return ['status' => 'ok'];
    } catch (Throwable $e) {
        return [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'sqlstate' => $e->getCode(),
        ];
    }
}`,
    hints: [
      'Return a generic user-facing message like "Unable to complete checkout."',
      'Log $e internally — do not expose getMessage/getFile to the client.',
    ],
    explanation: {
      why: 'Clients need actionable, non-sensitive messages; operators need stack traces in logs.',
      whyNot: 'SQLSTATE and paths reveal schema, ORM, and deployment layout to attackers.',
      correctApproach: 'error_log($e); return [\'error\' => \'Unable to complete checkout.\'];',
      commonMistakes: [
        'Hiding file but still returning getMessage() with SQL details.',
        'Different verbose errors per endpoint instead of consistent generic responses.',
      ],
    },
    variants: [
      {
        id: 'sec-error-disclosure-v2',
        title: 'Safe registration failure JSON',
        description: 'Stop returning exception traces in the registration API response.',
        starterCode: `<?php

function registerApi(array $input): array
{
    try {
        createUser($input);
        return ['ok' => true];
    } catch (Exception $e) {
        return [
            'ok' => false,
            'debug' => $e->getMessage() . ' in ' . $e->getFile(),
        ];
    }
}`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustNotMatch(code, /getFile\s*\(|getLine\s*\(/, 'Do not expose file or line to clients.'),
        () => mustNotMatch(code, /['"]debug['"]\s*=>/, 'Do not include debug fields in API responses.'),
        () => mustMatch(code, /error_log|logger|log/i, 'Log the exception server-side.'),
        () => mustMatch(code, /Unable to complete|Something went wrong|generic|request could not/i, 'Return a generic client message.'),
      ]);
    },
  },
];
