<?php

declare(strict_types=1);

/**
 * Software Design — Rule Examples
 * Each block: RULE, WHY, WHY NOT, DON'T DO, PREFER
 */

// =============================================================================
// RULE: DRY — centralize logic; avoid duplicate code
// WHY: One change updates all callers; fewer divergent copies to maintain.
// WHY NOT: Copy-paste spreads bugs and forces multi-file edits for one behavior change.
// =============================================================================

// --- DON'T DO ---
function formatOrderTotalA(Order $order): string
{
    return number_format($order->getTotalCents() / 100, 2) . ' ' . $order->getCurrency();
}

function formatOrderTotalB(Order $order): string
{
    return number_format($order->getTotalCents() / 100, 2) . ' ' . $order->getCurrency();
}

// --- PREFER ---
final class MoneyFormatter
{
    public function format(int $cents, string $currency): string
    {
        return number_format($cents / 100, 2) . ' ' . $currency;
    }
}

// =============================================================================
// RULE: DRY — repeated blocks must be extracted (any layer)
// WHY: One change updates all callers; duplicated blocks drift on the next bugfix.
// WHY NOT: Copy-paste across methods, templates, or stylesheets forces multi-site edits.
// =============================================================================

// --- DON'T DO ---
// formatOrderTotalA / formatOrderTotalB — identical bodies
// ApiController action A and B — same json_decode + entity guard try block
// widget-a / widget-b CSS — same declarations, different border-radius
// two .twig files — same lmap-readonly-label row grid copy-pasted

// --- PREFER ---
// Shared helper: MoneyFormatter, private decodeMqRequest(), {% include '_field_row.html.twig' %},
// .media-box + modifier class, <twig:FieldRow>, assets/js/utils/fetchJson.js

// =============================================================================
// RULE: KISS — choose the simplest effective solution
// WHY: Simple code has fewer failure modes and is faster to change.
// WHY NOT: Unnecessary layers add bugs, tests, and onboarding cost without benefit.
// =============================================================================

// --- DON'T DO ---
interface GreetingStrategyFactoryProvider { /* ... */ }
class DynamicGreetingStrategyFactory implements GreetingStrategyFactoryProvider { /* ... */ }

// --- PREFER ---
function greet(string $name): string
{
    return 'Hello, ' . $name;
}

// =============================================================================
// RULE: YAGNI — don't add features until strictly necessary
// WHY: Unused code still needs maintenance, documentation, and security review.
// WHY NOT: Speculative extension points become dead weight and wrong abstractions.
// =============================================================================

// --- DON'T DO ---
class UserService
{
    public function save(User $user, ?NotificationChannel $channel = null): void
    {
        // $channel unused today — "we might need Slack later"
    }
}

// --- PREFER ---
class UserService
{
    public function save(User $user): void
    {
        $this->repository->persist($user);
    }
}

// =============================================================================
// RULE: Separation of Concerns — distinct sections per concern
// WHY: UI, persistence, and transport change for different reasons.
// WHY NOT: Mixed layers make testing hard and encourage shortcut hacks in the wrong place.
// =============================================================================

// --- DON'T DO ---
class OrderController extends AbstractController
{
    public function list(): Response
    {
        $rows = $this->getDoctrine()->getConnection()->fetchAllAssociative(
            'SELECT * FROM orders WHERE user_id = ' . $_GET['user_id']
        );
        return $this->render('orders.html.twig', ['rows' => $rows]);
    }
}

// --- PREFER ---
// Controller: HTTP only. Repository: queries. Template: presentation.
class OrderController extends AbstractController
{
    public function list(OrderRepository $repo): Response
    {
        return $this->render('orders/index.html.twig', [
            'orders' => $repo->findForUser($this->getUser()),
        ]);
    }
}

// =============================================================================
// RULE: SRP — one reason to change per class
// WHY: Small classes are easier to name, test, and replace.
// WHY NOT: God classes accumulate unrelated edits and fragile coupling.
// =============================================================================

// --- DON'T DO ---
class UserManager
{
    public function register(User $user): void { /* ... */ }
    public function sendNewsletter(): void { /* ... */ }
    public function generatePdfInvoice(Order $order): string { /* ... */ }
}

// --- PREFER ---
class UserRegistrationService { public function register(User $user): void { /* ... */ } }
class NewsletterSender { public function send(): void { /* ... */ } }
class InvoicePdfGenerator { public function generate(Order $order): string { /* ... */ } }

// =============================================================================
// RULE: SRP — split multi-responsibility methods (names with And / Or / Then)
// WHY: Each concern (validate, persist, notify, parse HTTP) changes for different reasons.
// WHY NOT: One method doing A-or-B or C-and-D hides test seams and couples unrelated edits.
// =============================================================================

// --- DON'T DO ---
class OrderService
{
    public function fetchAndPersist(Order $order): void { /* query + mutate in one method */ }
}

class NotificationService
{
    public function sendAndLog(Email $email): void { /* transport + audit in one method */ }
}

class EmergencyContactService
{
    public function validateOrCreateEmergencyContact(Request $request, Person $person): EmergencyContact|array
    {
        // validate input, persist entity, flush, mutate request — four concerns, one name
        $request->request->remove('emergencyContact');
        return $contact;
    }
}

// --- PREFER ---
class OrderRepository { public function find(int $id): ?Order { /* ... */ } }
class OrderWriter { public function save(Order $order): void { /* ... */ } }

class EmailSender { public function send(Email $email): void { /* ... */ } }
class AuditLogger { public function logSent(Email $email): void { /* ... */ } }

class EmergencyContactValidator { public function validate(EmergencyContactAddInputs $input): ValidationResult { /* ... */ } }
class EmergencyContactFactory { public function create(Person $person, EmergencyContactAddInputs $input): EmergencyContact { /* ... */ } }
// Orchestrator or controller coordinates single-purpose steps; strip Request keys there

// =============================================================================
// RULE: Modularity — smaller independent interchangeable components
// WHY: Modules can be tested, swapped, and deployed with clear boundaries.
// WHY NOT: Monoliths inside a single file resist reuse and parallel work.
// =============================================================================

// --- DON'T DO ---
// 800-line functions.php with unrelated helpers

// --- PREFER ---
// src/Payment/GatewayInterface.php
// src/Payment/StripeGateway.php
// src/Payment/PayPalGateway.php

// =============================================================================
// RULE: Abstraction — hide complexity; expose relevant high-level features
// WHY: Callers depend on intent, not implementation details.
// WHY NOT: Leaked details (raw SQL strings at call sites) spread coupling everywhere.
// =============================================================================

// --- DON'T DO ---
$em->createQuery('SELECT o FROM App\Entity\Order o WHERE o.status = :s')
    ->setParameter('s', 'pending')
    ->getResult();

// --- PREFER ---
$orderRepository->findPending();

// =============================================================================
// RULE: Encapsulation — bundle data + methods; restrict internal access
// WHY: Invariants stay enforced inside the object boundary.
// WHY NOT: Public mutable fields let any caller break object state.
// =============================================================================

// --- DON'T DO ---
class Cart
{
    public array $items = [];
}

// --- PREFER ---
final class Cart
{
    /** @var list<CartItem> */
    private array $items = [];

    public function addItem(CartItem $item): void
    {
        $this->items[] = $item;
    }

    /** @return list<CartItem> */
    public function items(): array
    {
        return $this->items;
    }
}

// =============================================================================
// RULE: Minimize public surface — private helpers only used inside the class
// WHY: Public methods are API contracts; internal helpers should not leak.
// WHY NOT: getLmapPhoneCodeMap() public when only getAllPhoneCodeMap() is consumed externally.
// =============================================================================

// --- DON'T DO ---
class PhoneCodeService
{
    public function getLmapPhoneCodeMap(): array { return [/* ... */]; }
    public function getOtherPhoneCodeMap(): array { return [/* ... */]; }
    public function getAllPhoneCodeMap(): array { return array_merge($this->getLmapPhoneCodeMap(), $this->getOtherPhoneCodeMap()); }
}

// --- PREFER ---
class PhoneCodeService
{
    private function getLmapPhoneCodeMap(): array { return [/* ... */]; }
    private function getOtherPhoneCodeMap(): array { return [/* ... */]; }
    public function getAllPhoneCodeMap(): array { return array_merge($this->getLmapPhoneCodeMap(), $this->getOtherPhoneCodeMap()); }
}

// =============================================================================
// RULE: Maintain one source of truth — avoid duplicated state
// WHY: Derived copies drift; sync bugs are subtle and data-corrupting.
// WHY NOT: Two stores for the same fact require manual reconciliation forever.
// =============================================================================

// --- DON'T DO ---
// User.email in DB AND cached in session AND duplicated in JWT without sync strategy

// --- PREFER ---
// Canonical: User entity / users table. Session holds user id only; load email when needed.

// =============================================================================
// RULE: One variable, one meaning — no double duty (nullable payload as success signal)
// WHY: Callers cannot tell "not ready" from "empty"; partial data may be hidden or misused.
// WHY NOT: `items: null` plus a computed `$doAllHaveItems` duplicates one fact in two encodings.
// =============================================================================

// --- DON'T DO ---
class CollectivePaymentEvaluationResult
{
    public function __construct(
        private ?array $markedAssignments, // null = not all marked AND hides list
        private ScheduledTraining $predecessorScheduledTraining,
    ) {}
}

// Service:
// return new CollectivePaymentEvaluationResult(
//     markedAssignments: $doAllHaveOutcome ? $markedAssignments : null,
//     ...
// );
// Caller: if ($result !== null && $result->getMarkedAssignments() !== null) { ... }

// --- PREFER ---
class CollectivePaymentEvaluationResult
{
    public function __construct(
        private bool $doAllAssignmentsHaveOutcome,
        private ?array $markedAssignments, // non-null only when bool is true
        private ScheduledTraining $predecessorScheduledTraining,
    ) {}

    public function doAllAssignmentsHaveOutcome(): bool
    {
        return $this->doAllAssignmentsHaveOutcome;
    }
}

// Caller: if ($result?->doAllAssignmentsHaveOutcome()) { use $result->getMarkedAssignments(); }
