# General Principles — Rule Examples

---

## Rule: Minimize scope — only change what the task requires

**Why:** Focused diffs are easier to review, test, and revert; unrelated edits hide regressions.

**Why not:** Drive-by refactors in the same PR obscure the real change, increase merge conflict risk, and make bisecting bugs harder.

### Don't do

```diff
# PR title: "Fix login redirect"
+ refactor entire UserService naming
+ reformat unrelated controllers
+ fix typo in README
```

### Prefer

```diff
# PR title: "Fix login redirect"
  src/Security/LoginSuccessHandler.php
+   return new RedirectResponse($this->urlGenerator->generate('dashboard'));
```

---

## Rule: Match existing naming, types, and patterns in the surrounding code

**Why:** Consistency reduces cognitive load; readers predict structure from nearby files.

**Why not:** Mixed conventions (`getUser` vs `fetchUser`, `snake_case` vs `camelCase`) force constant context-switching and invite duplicate utilities.

### Don't do

```php
// File uses OrderRepository + findById everywhere
class OrderService {
    public function get_order(int $id): ?Order { /* ... */ }
}
```

### Prefer

```php
class OrderService {
    public function findById(int $id): ?Order { /* ... */ }
}
```

---

## Rule: Prefer simple, readable solutions over clever abstractions

**Why:** The next maintainer (often you) reads code more than they write it; clarity beats brevity.

**Why not:** Clever one-liners and premature abstractions slow onboarding and hide bugs behind indirection.

### Don't do

```javascript
const total = items.reduce((a, i) => a + (i?.p?.d ?? 0) * (i?.q ?? 1), 0);
```

### Prefer

```javascript
let total = 0;
for (const item of items) {
    total += item.price * item.quantity;
}
```

---

## Rule: Add comments only for non-obvious business logic or tricky technical details

**Why:** Comments should explain *why*, not restate *what* the code already says.

**Why not:** Noise comments drift out of sync and train readers to ignore real documentation.

### Don't do

```php
// Increment counter by one
$counter++;
```

### Prefer

```php
// Stripe counts failed webhooks toward rate limits — batch retries hourly
$retryQueue->schedule($event, new DateInterval('PT1H'));
```

---

## Rule: Suggest performance improvements when relevant

**Why:** N+1 queries and unbounded loops become production incidents as data grows.

**Why not:** Ignoring obvious hotspots ships latent scalability debt that is expensive to fix under load.

### Don't do — lazy-load N+1

```php
foreach ($orders as $order) {
    echo $order->getCustomer()->getName(); // lazy-loads customer per row
}
```

### Prefer — fetch join

```php
$orders = $orderRepository->findAllWithCustomer();
foreach ($orders as $order) {
    echo $order->getCustomer()->getName();
}
```

### Don't do — loop-invariant repository/service lookup repeated every iteration

```php
$registrationIdToOutcomeMap = [];
foreach ($registrationsData as $registrationData) {
    $moodleOutcomeString = $registrationData['outcome'];
    // trainingComponent is identical for every row; batch payloads often share one outcome string too
    $trainingComponentOutcome = $this->outcomeService->getTrainingComponentOutcomeFromMoodleOutcomeString(
        trainingComponent: $trainingComponentInstance->getTrainingComponent(),
        moodleOutcomeString: $moodleOutcomeString,
    );
    $registrationIdToOutcomeMap[$registrationData['tcir_id']] = $trainingComponentOutcome;
}
```

### Prefer — one batch query for all distinct keys, then map lookup in the loop

```php
$trainingComponent = $trainingComponentInstance->getTrainingComponent();

$uniqueMoodleOutcomeStrings = [];
foreach ($registrationsData as $registrationData) {
    $uniqueMoodleOutcomeStrings[$registrationData['outcome']] = true;
}

$moodleOutcomeStringToTrainingComponentOutcomeMap =
    $this->outcomeService->getTrainingComponentOutcomesFromMoodleOutcomeStrings(
        trainingComponent: $trainingComponent,
        moodleOutcomeStrings: array_keys($uniqueMoodleOutcomeStrings),
    ); // one repository query: o.name IN (:outcomeNames)

$registrationIdToOutcomeMap = [];
foreach ($registrationsData as $registrationData) {
    $moodleOutcomeString = $registrationData['outcome'];
    $registrationIdToOutcomeMap[$registrationData['tcir_id']] =
        $moodleOutcomeStringToTrainingComponentOutcomeMap[$moodleOutcomeString]
            ?? throw new \RuntimeException("No outcome for {$moodleOutcomeString}");
}
```

When the batch guarantees a single shared outcome, resolve once before the loop instead.

### Avoid — `??=` cache inside the loop (still one query per distinct key)

```php
// Better than per-row queries, but 5 distinct outcomes = 5 queries; prefer batch IN above
foreach ($rows as $row) {
    $cache[$row['outcome']] ??= $repo->findOneByTrainingComponentAndOutcome($tc, $row['outcome']);
}
```

---

## Rule: Remove dead code, unused variables, imports, and commented-out blocks

**Why:** Dead code confuses readers and may resurrect obsolete behavior during copy-paste edits.

**Why not:** Commented blocks and unused imports clutter diffs and suggest unfinished or abandoned logic.

### Don't do

```typescript
import { unusedHelper } from './helpers';
// const oldTotal = computeLegacyTotal(items);
const total = computeTotal(items);
```

### Prefer

```typescript
const total = computeTotal(items);
```

---

## Rule: Consider edge cases — empty collections, null values, boundary conditions

**Why:** Most production bugs surface at boundaries, not on the happy path.

**Why not:** Assuming non-empty arrays or non-null IDs causes runtime errors and bad UX for valid inputs.

### Don't do

```php
public function firstItemName(array $items): string {
    return $items[0]->getName();
}
```

### Prefer

```php
public function firstItemName(array $items): ?string {
    if ($items === []) {
        return null;
    }
    return $items[0]->getName();
}
```

### Also flag — validity filters on displayed or submitted entities

**Why:** Repository queries often exclude invalidated rows; UI paths that skip the same check resurrect stale data.

### Don't do

```php
// Priority (a): cart-linked contact — no validity check
$contact = $cartItem->getEmergencyContact();
```

### Prefer

```php
$contact = $cartItem->getEmergencyContact();
if ($contact !== null && $contact->getInvalidOnDatetime() !== null) {
    $contact = null;
}
// or resolve via findLatestValidByPerson() / repository helper
```

---

## Rule: Keep pull requests focused on a single concern; commit messages explain the *why*

**Why:** Atomic PRs map cleanly to issues, rollbacks, and code archaeology.

**Why not:** Mixed-concern PRs get superficial review and make `git blame` useless for understanding intent.

### Don't do

```
commit: "fixes"
# PR contains auth refactor + CSS tweak + DB migration
```

### Prefer

```
commit: "Reject expired sessions before loading user preferences

Session TTL changed in #412; preferences endpoint assumed a live session."
```
