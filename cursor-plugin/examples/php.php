<?php

declare(strict_types=1);

/**
 * PHP — Rule Examples (coding-standards.mdc)
 * Each block: RULE, WHY, WHY NOT, DON'T DO, PREFER
 */

namespace App\Examples;

use DateInterval;
use DateTimeImmutable;
use PDO;

// =============================================================================
// RULE: Follow PSR-1, PSR-12, PSR-4
// WHY: Interoperable style lets any PHP developer navigate the codebase.
// WHY NOT: Mixed brace styles and autoload breaks cause noisy diffs and CI failures.
// =============================================================================

// --- DON'T DO ---
// class user_repository { function Get($id) {} }  // wrong case, no namespace

// --- PREFER ---
// namespace App\Repository;
// final class UserRepository { public function find(int $id): ?User {} }

// =============================================================================
// RULE: Constructor DI; depend on interfaces, not concretions
// WHY: Test doubles swap easily; wiring lives in the container.
// WHY NOT: `new StripeGateway()` inside services blocks tests and environment-specific config.
// =============================================================================

// --- DON'T DO ---
class OrderExporterBad
{
    public function export(): string
    {
        $pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');
        return $pdo->query('SELECT * FROM orders')->fetchAll()[0];
    }
}

// --- PREFER ---
interface OrderRepositoryInterface
{
    /** @return list<array<string, mixed>> */
    public function findAllForExport(): array;
}

final class OrderExporterGood
{
    public function __construct(private OrderRepositoryInterface $orders) {}

    public function export(): array
    {
        return $this->orders->findAllForExport();
    }
}

// =============================================================================
// RULE: Type hints and return types; remove unused imports and injections
// WHY: Static analysis catches bugs before runtime.
// WHY NOT: Untyped parameters accept anything; dead injections confuse readers.
// =============================================================================

// --- DON'T DO ---
function calculateDiscount($order, $unusedLogger) {
    return $order->total * 0.1;
}

// --- PREFER ---
function calculateDiscount(Order $order): float
{
    return $order->getTotal() * 0.1;
}

// =============================================================================
// RULE: Validate datetime inputs; use DateTimeImmutable + DateInterval
// WHY: Mutable DateTime and fixed 86400-second days break across DST/time zones.
// WHY NOT: `$ts += 86400` can land on the wrong local day; mutable objects leak state.
// =============================================================================

// --- DON'T DO ---
function addOneDayBad(\DateTime $start): \DateTime
{
    $start->modify('+1 day'); // mutates caller's instance
    return $start;
}

// --- PREFER ---
function addOneDayGood(DateTimeImmutable $start): DateTimeImmutable
{
    return $start->add(new DateInterval('P1D'));
}

// =============================================================================
// RULE: Never trust foreign input — filter before use
// WHY: All external data is attacker-controlled until validated.
// WHY NOT: Raw `$_GET` enables injection, type confusion, and logic bypass.
// =============================================================================

// --- DON'T DO ---
$id = $_GET['id'];
$user = $db->query("SELECT * FROM users WHERE id = $id");

// --- PREFER ---
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if ($id === false || $id === null) {
    throw new \InvalidArgumentException('Invalid id');
}

// =============================================================================
// RULE: Prepared statements; never concatenate user input into SQL
// WHY: Parameter binding separates code from data — stops SQL injection.
// WHY NOT: String-built SQL is the #1 database compromise vector in PHP apps.
// =============================================================================

// --- DON'T DO ---
$stmt = $pdo->query("SELECT * FROM users WHERE email = '" . $email . "'");

// --- PREFER ---
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
$stmt->execute(['email' => $email]);

// =============================================================================
// RULE: password_hash / password_verify for passwords
// WHY: Built-in bcrypt/argon2 is slow-by-design and salted automatically.
// WHY NOT: SHA256 is fast — attackers brute-force millions of hashes per second.
// =============================================================================

// --- DON'T DO ---
$hash = hash('sha256', $password);

// --- PREFER ---
$hash = password_hash($password, PASSWORD_DEFAULT);
password_verify($plain, $hash);

// =============================================================================
// RULE: Never unserialize() untrusted data; use JSON
// WHY: PHP serialization can trigger object injection gadget chains.
// WHY NOT: `unserialize($_COOKIE['data'])` is a remote code execution footgun.
// =============================================================================

// --- DON'T DO ---
$data = unserialize($_POST['payload']);

// --- PREFER ---
$data = json_decode($_POST['payload'], true, 512, JSON_THROW_ON_ERROR);

// =============================================================================
// RULE: Sanitize user-controlled file paths
// WHY: `../` and null bytes escape intended directories.
// WHY NOT: `file_get_contents('/uploads/' . $name)` reads `/etc/passwd` when crafted.
// =============================================================================

// --- DON'T DO ---
$path = '/var/app/uploads/' . $_GET['file'];

// --- PREFER ---
$name = basename($_GET['file']);
$name = str_replace(["\0", '..'], '', $name);
$path = '/var/app/uploads/' . $name;

// =============================================================================
// RULE: escapeshellarg() for shell arguments
// WHY: Shell metacharacters in user input become command injection.
// WHY NOT: `exec("convert $userPath out.png")` runs arbitrary commands.
// =============================================================================

// --- DON'T DO ---
exec('php bin/console import ' . $filename);

// --- PREFER ---
exec('php bin/console import ' . escapeshellarg($filename));

// =============================================================================
// RULE: htmlspecialchars for HTML output (XSS prevention)
// WHY: Escaping on output is the last line of defense for reflected/stored XSS.
// WHY NOT: Echoing raw user HTML executes scripts in victims' browsers.
// =============================================================================

// --- DON'T DO ---
echo '<p>' . $userBio . '</p>';

// --- PREFER ---
echo '<p>' . htmlspecialchars($userBio, ENT_QUOTES, 'UTF-8') . '</p>';

// =============================================================================
// RULE: Typed exceptions; avoid @ suppression
// WHY: Exceptions carry context; @ hides failures you need in logs.
// WHY NOT: `@file_get_contents` returns false silently — bugs surface later as corrupt data.
// =============================================================================

// --- DON'T DO ---
$content = @file_get_contents($path);

// --- PREFER ---
try {
    $content = file_get_contents($path);
} catch (\Throwable $e) {
    throw new FileReadException('Cannot read upload', 0, $e);
}

// =============================================================================
// RULE: One precondition per guard — distinct exception messages
// WHY: Blended messages hide which rule failed; support and MQ replay need the exact reason.
// WHY NOT: `if (A || B) throw` with "A or B" forces guessing or re-debugging in production.
// =============================================================================

// --- DON'T DO ---
if (
    is_null($registration->getTrainingCommencedDatetime()) ||
    !is_null($registration->getWithdrawnDatetime())
) {
    throw new \Exception('Assignment has not commenced or has been withdrawn.');
}

// --- PREFER ---
if (is_null($registration->getTrainingCommencedDatetime())) {
    throw new \Exception('Assignment has not commenced.');
}
if (!is_null($registration->getWithdrawnDatetime())) {
    throw new \Exception('Assignment has been withdrawn.');
}

// =============================================================================
// RULE: Avoid N+1 queries and unbounded table scans
// WHY: Latency grows linearly with rows; DB becomes the bottleneck.
// WHY NOT: `findAll()` on million-row tables OOMs or times out HTTP requests.
// =============================================================================

// --- DON'T DO ---
foreach ($orders as $order) {
    $order->getCustomer()->getName();
}

// --- PREFER ---
// Repository: JOIN customer or fetch join in DQL

// =============================================================================
// SIDE EFFECTS: bulk transform, not loop mutation of shared state
// WHY: Pure transforms are predictable and parallel-safe.
// WHY NOT: Mutating `$result` inside foreach races when reused or passed by reference.
// =============================================================================

// --- DON'T DO ---
function doublePricesBad(array $items): array
{
    $result = [];
    foreach ($items as $item) {
        $item['price'] *= 2;
        $result[] = $item;
    }
    return $result;
}

// --- PREFER ---
function doublePricesGood(array $items): array
{
    return array_map(
        fn (array $item): array => ['price' => $item['price'] * 2] + $item,
        $items
    );
}

// =============================================================================
// TRY/CATCH: tiny try blocks; specific exceptions; never swallow
// WHY: Validation belongs outside try; catch-all hides programming errors.
// WHY NOT: Bloated try makes it unclear which line failed; empty catch loses incidents.
// =============================================================================

// --- DON'T DO ---
try {
    if ($email === '') throw new \InvalidArgumentException();
    $this->mailer->send($email);
} catch (\Exception $e) {
    return null;
}

// --- PREFER ---
if ($email === '') {
    throw new \InvalidArgumentException('Email required');
}
try {
    $this->mailer->send($email);
} catch (TransportExceptionInterface $e) {
    $this->logger->error('Mail send failed', ['email' => $email, 'exception' => $e]);
    throw $e;
}

// =============================================================================
// RETURNS: no untyped nested associative array wrappers
// WHY: String keys are not refactor-safe; IDE cannot assist.
// WHY NOT: `['numbers' => ..., 'fruits' => ...]` forces callers to guess shape.
// =============================================================================

// --- DON'T DO ---
function fetchDashboardBad(): array
{
    return ['orders' => $this->orders->count(), 'users' => $this->users->count()];
}

// --- PREFER ---
final readonly class DashboardStats
{
    public function __construct(public int $orderCount, public int $userCount) {}
}

// =============================================================================
// RETURNS: nullable payload must not encode a separate readiness outcome
// WHY: Callers infer business state from `getItems() === null` — ambiguous and brittle.
// WHY NOT: `$ready ? $items : null` duplicates a fact already in `$ready`.
// =============================================================================

// --- DON'T DO ---
return new EvaluationResult(
    markedItems: $doAllHaveOutcome ? $markedItems : null,
);

// --- PREFER ---
return new EvaluationResult(
    doAllHaveOutcome: $doAllHaveOutcome,
    markedItems: $doAllHaveOutcome ? $markedItems : null,
);

// =============================================================================
// RETURNS: src/Dto classes must not persist — passive data carriers only
// WHY: Persistence is infrastructure; DTOs should not depend on EntityManager.
// WHY NOT: persistResult() on a DTO forces every caller to know Doctrine details.
// =============================================================================

// --- DON'T DO ---
// class RegistrationOutcomeAddUpdateResult {
//     public function persistResult(EntityManagerInterface $em): void { $em->persist(...); }
// }

// --- PREFER ---
// class RegistrationOutcomeService {
//     public function persistResult(RegistrationOutcomeAddUpdateResult $result, EntityManagerInterface $em): void { ... }
// }

// =============================================================================
// NAMING: verb-first; no vague verbs; no And/Or/Then; queries don't mutate
// WHY: Names document behavior at call sites.
// WHY NOT: `processAndSaveAndNotify` is three functions wearing a trenchcoat.
// =============================================================================

// --- DON'T DO ---
public function user(int $id): void { $this->em->remove($this->repo->find($id)); }

// --- PREFER ---
public function deleteUser(int $id): void { /* ... */ }

// =============================================================================
// NAMING: what you do/perform — not how, where, or why in the identifier
// WHY: Call sites document domain intent and stay stable when transport or routing changes.
// WHY NOT: Names that encode mechanism, destination, or trigger leak implementation at every caller.
// =============================================================================

// --- DON'T DO (how / where / why baked into the name) ---
public function sendEmailViaSmtpQueue(User $user): void { /* ... */ }
public function fetchActiveUsersFromReadReplica(): array { /* ... */ }
public function cancelOrderOnCheckoutFailure(Order $order): void { /* ... */ }

// --- PREFER (domain action only) ---
public function sendWelcomeEmail(User $user): void { /* ... */ }
public function fetchActiveUsers(): array { /* ... */ }
public function cancelOrder(Order $order): void { /* ... */ }

// =============================================================================
// CONTROL STRUCTURES: explicit {} on every branch
// WHY: Adding a second statement under a brace-less if is a classic bug.
// WHY NOT: `if ($x) return false;` + new line looks attached but isn't after merge.
// =============================================================================

// --- DON'T DO ---
if ($user === null) return false;

// --- PREFER ---
if ($user === null) {
    return false;
}
