import type { Problem } from '../../types';
import { mustMatch, mustNotMatch, runChecks } from '../../engine/validator';

export const phpProblems: Problem[] = [
  {
    id: 'php-di-1',
    ruleId: 'php-di',
    category: 'php',
    title: 'Inject the order repository',
    description:
      'OrderExporter creates PDO directly. Refactor to constructor injection with an OrderRepositoryInterface dependency.',
    language: 'php',
    starterCode: `<?php

class OrderExporter
{
    public function export(): array
    {
        $pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');
        return $pdo->query('SELECT * FROM orders')->fetchAll();
    }
}`,
    hints: [
      'Define OrderRepositoryInterface with findAllForExport().',
      'Inject it via __construct and call it from export().',
    ],
    explanation: {
      why: 'Constructor DI lets tests swap a fake repository and keeps credentials out of the service.',
      whyNot: 'new PDO() inside the class blocks unit tests and hard-codes environment config.',
      correctApproach: '__construct(private OrderRepositoryInterface $orders) and return $this->orders->findAllForExport().',
      commonMistakes: [
        'Injecting PDO instead of a domain repository — still leaks persistence details.',
        'Using a static factory instead of constructor injection.',
      ],
    },
    variants: [
      {
        id: 'php-di-v2',
        title: 'Inject mailer into Notifier',
        description: 'Stop constructing SwiftMailer inside Notifier; inject MailerInterface instead.',
        starterCode: `<?php

class Notifier
{
    public function sendWelcome(User $user): void
    {
        $mailer = new Swift_Mailer(new Swift_SmtpTransport('localhost'));
        $mailer->send(new Swift_Message('Welcome', 'Hello'));
    }
}`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /interface\s+OrderRepositoryInterface/, 'Define OrderRepositoryInterface.'),
        () => mustMatch(code, /__construct/, 'Use constructor injection.'),
        () => mustNotMatch(code, /new\s+PDO/, 'Do not instantiate PDO inside the exporter.'),
        () => mustMatch(code, /findAllForExport/, 'Delegate to findAllForExport on the repository.'),
      ]);
    },
  },
  {
    id: 'php-prepared-statements-1',
    ruleId: 'php-prepared-statements',
    category: 'php',
    title: 'Use a prepared statement for email lookup',
    description:
      'Replace string concatenation in the SQL query with a PDO prepared statement and bound :email parameter.',
    language: 'php',
    starterCode: `<?php

function findUserByEmail(PDO $pdo, string $email): ?array
{
    $sql = "SELECT * FROM users WHERE email = '" . $email . "'";
    $row = $pdo->query($sql)->fetch();
    return $row ?: null;
}`,
    hints: [
      'Use $pdo->prepare() with :email placeholder.',
      'Execute with [\'email\' => $email].',
    ],
    explanation: {
      why: 'Parameter binding separates code from data — the database treats input as values, not SQL.',
      whyNot: 'Concatenated SQL lets attackers inject quotes and rewrite the query.',
      correctApproach: "prepare('SELECT ... WHERE email = :email') then execute(['email' => $email]).",
      commonMistakes: [
        'Using prepare but still interpolating $email into the SQL string.',
        'Escaping manually instead of binding — error-prone and incomplete.',
      ],
    },
    variants: [
      {
        id: 'php-prepared-v2',
        title: 'Prepared statement for id lookup',
        description: 'Fix findOrderById to use a bound :id parameter.',
        starterCode: `<?php

function findOrderById(PDO $pdo, int $id): ?array
{
    return $pdo->query("SELECT * FROM orders WHERE id = $id")->fetch() ?: null;
}`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /->prepare\s*\(/, 'Use prepare() for the query.'),
        () => mustMatch(code, /:email|:id/, 'Use a named placeholder.'),
        () => mustNotMatch(code, /'\s*\.\s*\$email|"'\s*\.\s*\$|"SELECT[^"]*\$id/, 'Do not concatenate user input into SQL.'),
        () => mustMatch(code, /->execute\s*\(/, 'Call execute() with bound parameters.'),
      ]);
    },
  },
  {
    id: 'php-password-hash-1',
    ruleId: 'php-password-hash',
    category: 'php',
    title: 'Hash passwords with password_hash',
    description:
      'Replace SHA256 hashing with password_hash and verify with password_verify.',
    language: 'php',
    starterCode: `<?php

function hashPassword(string $plain): string
{
    return hash('sha256', $plain);
}

function checkPassword(string $plain, string $stored): bool
{
    return hash('sha256', $plain) === $stored;
}`,
    hints: [
      'Use password_hash($plain, PASSWORD_DEFAULT).',
      'Use password_verify($plain, $stored) for checking.',
    ],
    explanation: {
      why: 'password_hash uses bcrypt/argon2 — slow, salted, and designed for credentials.',
      whyNot: 'SHA256 is fast; attackers can brute-force billions of guesses offline.',
      correctApproach: 'hashPassword returns password_hash(...); checkPassword uses password_verify(...).',
      commonMistakes: [
        'Salting manually but still using SHA256.',
        'Using md5 or base64_encode — equally unsuitable.',
      ],
    },
    variants: [
      {
        id: 'php-password-v2',
        title: 'Fix registerUser credential storage',
        description: 'Store credentials using password_hash instead of md5.',
        starterCode: `<?php

function registerUser(string $email, string $password): array
{
    return [
        'email' => $email,
        'password_hash' => md5($password),
    ];
}`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /password_hash/, 'Use password_hash for storing passwords.'),
        () => mustMatch(code, /password_verify/, 'Use password_verify for checking.'),
        () => mustNotMatch(code, /hash\s*\(\s*['"]sha256|md5\s*\(/, 'Do not use fast general-purpose hashes for passwords.'),
      ]);
    },
  },
  {
    id: 'php-input-validation-1',
    ruleId: 'php-input-validation',
    category: 'php',
    title: 'Validate GET id before use',
    description:
      'Never use raw $_GET. Validate the id with filter_input and throw InvalidArgumentException when invalid.',
    language: 'php',
    starterCode: `<?php

function loadUser(PDO $pdo): ?array
{
    $id = $_GET['id'];
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->fetch() ?: null;
}`,
    hints: [
      'Use filter_input(INPUT_GET, \'id\', FILTER_VALIDATE_INT).',
      'Throw InvalidArgumentException when validation fails.',
    ],
    explanation: {
      why: 'filter_input rejects non-integers before they reach SQL or business logic.',
      whyNot: 'Raw $_GET accepts arrays, strings, and injection payloads — type confusion follows.',
      correctApproach: 'Validate int id; if false/null, throw; otherwise bind the integer.',
      commonMistakes: [
        'Casting (int)$_GET[\'id\'] without validating — 0 and garbage become 0.',
        'Validating but still passing unvalidated input to the query.',
      ],
    },
    variants: [
      {
        id: 'php-input-v2',
        title: 'Validate page query parameter',
        description: 'Validate page as a positive integer from $_GET before using it.',
        starterCode: `<?php

function currentPage(): int
{
    return (int) $_GET['page'];
}`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /filter_input|filter_var/, 'Use filter_input or filter_var to validate.'),
        () => mustNotMatch(code, /\$_GET\s*\[\s*['"]id['"]\s*\]\s*;/, 'Do not assign raw $_GET directly.'),
        () => mustMatch(code, /InvalidArgumentException|throw new/, 'Throw when validation fails.'),
      ]);
    },
  },
  {
    id: 'php-datetime-immutable-1',
    ruleId: 'php-datetime-immutable',
    category: 'php',
    title: 'Add one day without mutating caller date',
    description:
      'Fix addOneDay so it accepts DateTimeImmutable, uses DateInterval, and returns a new instance.',
    language: 'php',
    starterCode: `<?php

function addOneDay(DateTime $start): DateTime
{
    $start->modify('+1 day');
    return $start;
}`,
    hints: [
      'Change parameter and return type to DateTimeImmutable.',
      'Return $start->add(new DateInterval(\'P1D\')).',
    ],
    explanation: {
      why: 'Immutable dates prevent surprise mutations; DateInterval handles DST correctly.',
      whyNot: 'modify() mutates the caller\'s object; fixed 86400-second offsets break across DST.',
      correctApproach: 'function addOneDay(DateTimeImmutable $start): DateTimeImmutable { return $start->add(new DateInterval(\'P1D\')); }',
      commonMistakes: [
        'Cloning then modifying — still returns mutable DateTime.',
        'Adding 86400 seconds instead of P1D interval.',
      ],
    },
    variants: [
      {
        id: 'php-datetime-v2',
        title: 'Schedule retry without mutation',
        description: 'Return a new immutable datetime one hour later instead of modifying in place.',
        starterCode: `<?php

function scheduleRetry(DateTime $at): DateTime
{
    $at->modify('+1 hour');
    return $at;
}`,
      },
    ],
    validate(code) {
      return runChecks([
        () => mustMatch(code, /DateTimeImmutable/, 'Use DateTimeImmutable.'),
        () => mustMatch(code, /DateInterval/, 'Use DateInterval for arithmetic.'),
        () => mustNotMatch(code, /->modify\s*\(/, 'Do not mutate with modify().'),
      ]);
    },
  },
];
