---
name: lmap-code-review
description: >-
  Reviews code changes for bugs, security issues, regressions, and maintainability
  using project coding standards. Use when the user asks for a code review, review
  my changes, PR feedback, diff review, or pre-merge check — including uncommitted
  changes, branch diffs, and pull requests.
disable-model-invocation: true
---

# Code Reviewer

In-chat review for diffs and PRs. For automated deep scans, use `review-bugbot` or `review-security` instead.

## When to use

- User asks to review code, a diff, branch, or PR
- Evaluating merge readiness before opening or merging a PR
- Sanity-checking a change set after automated review (Bugbot, CI)

## When to defer

| Need | Use instead |
|------|-------------|
| Broad bug/regression scan via subagent | `review-bugbot` |
| Security-focused subagent review | `review-security` |
| Fixing findings | User must ask explicitly |

## Review workflow

1. **Understand context** — what feature or bug is being addressed? Read the PR description if available.
2. **Gather the diff or file list**
   - Uncommitted only → `git diff` and `git diff --staged`
   - Branch vs base → `git diff <base>...HEAD` (default base: repo default branch)
   - PR → `gh pr diff` or checkout PR branch first
   - **Directory / tree** (e.g. “all files in `backend/`”) → enumerate every source file under that path (`find`, glob); there is no diff filter — review the full tree
   - Record the **base branch** used (e.g. `feature`) — required for migration and GET/POST passes below
3. **Scope standards to files under review** — list every path, then use **Section map by changed file** in `rules/coding-standards.mdc` (§ **Code review scope**). Union every matching row across all files. Always include **General principles**, **Software design**, and **Review detection checklist**.
4. **Read only scoped sections** — use the **Section files** table in `rules/coding-standards.mdc` to open **only** the rules files for sections from step 3 (not the full standards tree). For each section, read its paired **examples** file from the **Rule examples** table (index: `examples/README.md`). Standards bullets define *what* to check; examples provide **don't-do** / **prefer** pairs plus **why** / **why-not**. Do not rely on memory or this skill's summaries alone.
5. **Run the Review detection checklist** — in `rules/review-detection-checklist.mdc`:
   - Run **Grep execution hints** patterns for every matching row — especially `css-formatting` (`;\s+[a-z-]+\s*:` in `*.css`), `encapsulation` (`private static array $`), `pg-locking` (`httpClient->request` in listeners), `symfony-i18n` (prose inside `{% trans %}`), `html-links` (`<time>` / `<abbr>` missing attributes), `php-di` (untyped `$param`), `api-rest` (`DELETE` returning `JsonResponse`), **`owasp-disclosure`** (`'Invalid request:` detail and `same-host`/`referer` in controller string literals; multiline `addFlash` with security-control names; API bodies with exception strings), **`php-side-effects`** (`$request->request->remove|set` in `src/Service/**`), **`php-naming` / `js-functions` / `abstraction`** (`function \w*(And|Or)[A-Z]`; **how/where/why in names**: `Via|Through|Using|With`, `To|From|Into`, `On|When|After|Before` + infra/trigger tokens — manual pass: name **what** is done/performed), **`php-exceptions`** (compound `if` with `\|\|`/`&&` before one `throw`; blended `"… or …"` exception messages), **`single-source-of-truth`** (`$doAll\w+ ? $data : null`; chained `!is_null($dto) && !is_null($dto->get…())`), **`lmap`** (**`getEntityById` `$name` labels** inconsistent for the same `::class`), **`separation-of-concerns`** (`EntityManagerInterface` or `persistResult` in `src/Dto/**`), **`encapsulation`** (public `get*` methods only used in same class), **`jquery-events`** (`.on('submit'` callbacks that nest `.on(` / `.off(`), **`dry`/`modularity`/`css-reuse`** (repeated blocks — see **Diff-context passes** § repeated code blocks), and **`performance`** (`foreach` loops with `->find*` / service resolvers per row — batch `IN` load; see **Diff-context passes** § loop lookups).
   - `Grep`/`rg` **every** checklist row whose file-type column matches a file under review (note: `src/Service/**` includes `MonolithOperationsHub.php` and similar — not only `*Service.php`).
   - Run the **Manual review pass** for labels marked **manual** in **Checklist coverage**, and for bullets listed under **Manual review pass** (including `encapsulation`, `php-di`, `pg-locking`, `owasp-defect-management`, **`pg-schema`** when migrations are in the diff, **`edge-cases`** validity filters, **`dry`** / **`modularity`** / **`simplicity`** repeated-code pass on all file types in the diff, **`srp`** validate+create combos, **`performance`** batch vs per-row / per-key loop lookups).
   - Run the **Diff-context passes** (same section) on every branch/PR review — **mandatory** for all reviews (includes §6 **repeated code blocks** on every changed PHP/Twig/CSS/JS file); also mandatory when the diff touches `migrations/*.php`, paired GET/POST controller actions, new `Twig/Component/*` trees, **`foreach` / `array_map` blocks that resolve entities or DTOs per row**, PHP files calling **`getEntityById`**, or **`addFlash` / referer-guard changes in `*Controller.php`** (see §7 user-facing error verbosity).
   - Each grep hit becomes a finding tagged with that row's **Standard** label (split unrelated hits into separate findings). Do not stop after SQL injection or security — finish all rows.
   - In **Checklist traceability**, list **every** Standard label from the table below — either `N finding(s)` or `searched, no match` / `manual pass, no match`. Never mark `css-formatting` as no match when `*.css` has `prop:…; prop:` on one line.
6. **Read changed files in context** — surrounding code, callers, and tests for touched behavior. For Twig, merge `extends` / `include` / `embed` chains mentally and review the composed page. When a service method iterates multiple collections for one business rule, read the paired controller actions and confirm they use the same sources.
7. **Review every file** — walk every file and hunk systematically; do not stop after the first issue. Check every bullet in each scoped section against the paired examples blocks.
8. **Cross-check security config** — when controllers or API routes are in scope, read `config/packages/security.yaml` and verify `access_control` / `#[IsGranted]` cover `/api`, `/internal`, and admin or mutating endpoints. Cross-check every mutating `#[Route]` has auth when siblings do.
9. **Check Symfony deprecations when relevant** — when scoped sections include Symfony (deprecations), flag deprecated API usage and confirm `phpunit*.xml` keeps `failOnDeprecation="true"` (and `ignoreIndirectDeprecations` / `ignoreSuppressionOfDeprecations` are not enabled) with Symfony/Doctrine `deprecationTrigger` entries; suggest `php bin/console debug:container --deprecations` for compile-time issues.
10. **Review in priority order** — correctness and regressions → security → type safety → missing tests → maintainability → style → performance. **Do not skip the performance pass** on changed `foreach` / `array_map` blocks: per-row `find*` calls and `??=` caches that still query inside the loop are checklist-mandatory (`performance`, `doctrine-queries`) — prefer one batch `IN` query for distinct keys before the loop.
11. **Report all findings** using the format below. **Tag every standards violation** with a **Standard** label — an untagged SQL-injection or `@` suppression finding is incomplete.
12. **Acknowledge positive patterns** — note good design, naming, error handling, security, or test coverage where observed.

## Standards scoping

The **Section map by changed file** in `rules/coding-standards.mdc` (§ **Code review scope**) is the source of truth. A single file may match multiple rows — union all applicable sections. Skip sections with no matching changed files.

For **directory-wide** reviews, treat every file under the path as in scope — union sections across the whole tree (expect most Symfony sections to apply).

The **Review detection checklist** in `rules/review-detection-checklist.mdc` is mandatory for every review. It lists concrete search patterns for labels that are easy to miss when reading only high-severity bullets (jQuery selector rules, `html-markup` uppercase tags, `symfony-templates` layout extends, `encapsulation` **public and private static** service properties, **`public function` helpers only used in the same class**, `php-returns` untyped array wrappers, `php-di` `new PDO` **and untyped `$param`**, **`$request->request->remove` in services**, **`persistResult` / `EntityManagerInterface` in `src/Dto/**`**, **method names encoding how/where/why instead of domain action**, **`validateOr*` / `*And*` method names**, **`if (A || B) throw` with blended exception messages**, **`$doAllX ? $items : null` double-duty nullable payloads**, **`getEntityById` `$name` labels** (`lmap`), `mail()` in `src/Service/**`, hard-coded `PEPPER` constants, `ignoreIndirectDeprecations` in PHPUnit, **`css-formatting` one-line rule blocks**, **`pg-locking` HTTP in Doctrine listeners**, **`symfony-i18n` prose in `{% trans %}`**, **`html-links` `<time>` / `<abbr>` attributes**, **`api-rest` DELETE without 204**, **`owasp-disclosure` flash messages naming referer/CSRF/token checks or `Invalid request:` detail on public controllers**, **in-place migration edits** via **Diff-context passes**, **GET/POST resolution drift**, **Twig component markup duplication**, **`jquery-events` rebind inside submit handlers**, **`performance` per-row `find*` / missing batch `IN` load for distinct loop keys**, **`dry` / `css-reuse` repeated code blocks in PHP/Twig/CSS/JS**, etc.). Labels marked **manual** in **Checklist coverage** still require a dedicated pass — grep alone is insufficient.

## Thoroughness

- **Report every issue you find** — aim for maximum coverage, not a minimal list.
- **One finding per issue** — do not bundle unrelated problems into a single bullet.
- **Include lower-severity items** — report suggestions and nice-to-haves even when critical issues exist.
- **Check untouched lines in changed files** — if surrounding code reveals a pre-existing bug or standards violation directly related to the change, note it.
- **Be constructive and specific** — base feedback on the scoped sections of `coding-standards.mdc` and their matching `examples/` rule blocks, not personal preference; when a finding maps to a standard, include the **don't-do** / **prefer** pair from that block (see **Feedback format**).
- **Prioritize issues** — distinguish runtime errors and security risks from style nits; still **report** repeated-code and loop-lookup findings even when higher-severity issues exist.

## Standard labels

Tag each finding with a **Standard** label when it maps to `coding-standards.mdc`. Omit the field for pure logic bugs with no standards tie-in.

Labels group related bullets — read only the scoped section's rules file from the **Section files** table in `rules/coding-standards.mdc` (per **Code review scope**) and the matching `examples/` file when applying a label.

| Label | Section | Flag when you see… |
|-------|---------|-------------------|
| `scope` | General | Unrelated edits, drive-by refactors, or an oversized diff for the stated goal |
| `conventions` | General | Naming, types, or patterns inconsistent with surrounding code; **method names encoding how/where/why** instead of what is done/performed |
| `simplicity` | General | Over-abstraction, clever one-liners, unnecessary indirection, or duplicated Twig/CSS/JS/PHP markup and logic that should call an existing shared abstraction |
| `comments` | General | Missing docs on tricky logic, or noise comments on obvious code |
| `performance` | General / PHP / PostgreSQL / Doctrine ORM | N+1 queries, **per-row or per-key `find*` inside `foreach` (prefer one batch `IN` query for distinct keys before loop)**, redundant loops, unpaginated large queries, missing indexes, deep OFFSET pagination, heavy lifecycle events |
| `dead-code` | General | Unused variables, imports, or commented-out blocks |
| `edge-cases` | General / PHP | Missing handling for empty arrays, nulls, boundaries, invalid datetimes, soft-deleted/invalid entities shown or accepted, controller loops that omit collections a paired service checks, compound guards that hide which precondition failed, or **nullable payload inferring readiness** (`getItems() === null` as success signal) |
| `commit-hygiene` | General | Vague commits or a PR mixing unrelated concerns |
| `dry` | Software design | Duplicated logic, copy-pasted blocks, or parallel implementations in **any layer** (PHP, Twig, CSS, JS) — including sibling methods, templates, stylesheets, and modules that differ only by names/ids/selectors |
| `kiss` | Software design | Unnecessary complexity, indirection, or over-engineering when a simpler approach works |
| `yagni` | Software design | Speculative features, unused extension points, or abstractions added before a real need exists |
| `separation-of-concerns` | Software design | Mixed layers or responsibilities in one module (e.g. SQL in controllers, UI logic in repositories, **request bag mutation in services**, **`persistResult()` / `EntityManagerInterface` on `src/Dto/` classes**) |
| `srp` | Software design | A class or module with multiple unrelated reasons to change; methods that validate **and** create/persist (e.g. `validateOrCreate…`) instead of separate validator + factory; **DTOs that both carry result data and perform persistence** |
| `modularity` | Software design | Monolithic blocks that should be split into smaller, independent, interchangeable components; **repeated ≥5–10 line blocks that should become a shared function, partial, component, or utility module** |
| `abstraction` | Software design | Leaked implementation details at call sites, or missing abstractions that hide irrelevant complexity; **domain-layer methods whose names encode how, where, or why** instead of the action performed |
| `encapsulation` | Software design | Exposed internals, public mutable fields, unnecessary `public` methods only used within the class, or callers reaching past an object's boundary |
| `single-source-of-truth` | Software design | Duplicated state or derived copies that can drift out of sync across locations; **one variable encoding two facts** (nullable array/object as both payload and readiness/success signal) |
| `lmap` | LMAP | **`getEntityById` `$name` strings** that do not match the entity `::class` being loaded — PascalCase class names, UI or domain slang, synonyms, or labels inconsistent with sibling call sites for the same `::class` |
| `php-psr` | PHP | PSR-1/12/4 style, namespace, or autoloading violations |
| `php-di` | PHP | Hard-coded dependencies, missing type hints, concretion over abstraction, unused DI |
| `php-input` | PHP | Unvalidated/unfiltered request, upload, or third-party data |
| `php-security` | PHP | SQL injection, XSS, CSRF gaps, weak hashing, `unserialize()` on untrusted data, path traversal in file paths, unsanitized shell arguments |
| `php-datetime` | PHP | Fixed-seconds-per-day assumptions; mutable `DateTime` where `DateTimeImmutable`/`DateInterval` fit |
| `php-exceptions` | PHP | `@` suppression, swallowed errors, missing exception handling, **`if (A \|\| B)` / `if (A && B)` combining unrelated checks before one `throw`** with a blended message |
| `php-side-effects` | PHP | Loop mutation of shared state; in-place object/array mutation; **mutating `Request` inside services** (`$request->request->remove|set`) |
| `php-try-catch` | PHP | Bloated try blocks, catching `\Exception`/`\Throwable`, empty catch, missing `finally` |
| `php-returns` | PHP | Untyped nested array returns instead of DTOs or decomposed functions; **DTO fields doing double duty** (null collection meaning “not complete” while a bool could express outcome); **passive DTOs only** — no `persist`/`flush` on `src/Dto/` |
| `php-naming` | PHP | Non-verb names, vague verbs, **`Or`/`And`/`Then` in names** (`validateOrCreate`), query methods that mutate; names encoding **how/where/why** (`ViaSmtp`, `FromReplica`, `OnFailure`) instead of **what** is done/performed |
| `php-control-blocks` | PHP | Brace-less `if`/`foreach`/`while` or one-line returns without `{}` |
| `js-variables` | JavaScript | `var`, `let` where `const` suffices, poor names, undefined variables; **`null`/`undefined`/`[]` overloaded as readiness vs empty data** |
| `js-functions` | JavaScript | Wrong casing, arrow functions for methods, vague or multi-responsibility names; **how/where/why in names** (`ViaFetch`, `OnPageLoad`, `ToApi`) instead of domain action |
| `js-control-flow` | JavaScript | Index loops where `for...of` fits, `for...in` on arrays, missing braces |
| `js-operators` | JavaScript | Loose equality, `+val`/`"" + val` coercion |
| `js-async` | JavaScript | Raw Promise chains, top-level `await` in CommonJS, unhandled fetch errors |
| `js-errors` | JavaScript | Swallowed errors, bloated try blocks, generic catch masking failures |
| `js-mutation` | JavaScript | In-place mutation of passed objects/arrays on shared references |
| `js-dom` | JavaScript | `innerHTML` for plain text, XHR instead of `fetch`, inline event handlers |
| `js-comments` | JavaScript | `console.log` in production paths, noise comments |
| `jquery-loading` | jQuery | Multiple jQuery versions on one page; missing CDN fallback |
| `jquery-scoping` | jQuery | Missing IIFE; `$` leaking into global scope |
| `jquery-selectors` | jQuery | Repeated selectors, nested/qualified IDs, excessive specificity, missing context |
| `jquery-empty` | jQuery | Animations or DOM actions on empty selections without `.length` check |
| `jquery-events` | jQuery | Per-element binding where delegation fits; anonymous event handlers; `.on()` / `.off()` inside submit handlers (rebinds on every attempt) |
| `jquery-api` | jQuery | Chained setter calls instead of object-literal arguments |
| `css-consistency` | CSS | Mixed indentation, color notation, or naming conventions within a stylesheet or project |
| `css-formatting` | CSS | Multiple declarations crammed onto one line; unreadable rule blocks |
| `css-comments` | CSS | Missing section markers (`/* || … */`); undocumented fallbacks, workarounds, or tutorial-derived code |
| `css-structure` | CSS | Wrong section ordering; monolithic stylesheet that should be split by concern or page |
| `css-selectors` | CSS | Overly specific compound selectors that duplicate rules or block reuse |
| `css-reuse` | CSS | Near-identical rules copied per component instead of shared reusable classes (OOCSS-style); **duplicate rule blocks in the same diff** flagged by § repeated code blocks pass |
| `css-methodology` | CSS | BEM/SMACSS/ITCSS naming violations when the project adopts that methodology |
| `css-tokens` | CSS | Repeated hard-coded colors, fonts, or spacing instead of custom properties or Sass variables |
| `css-build` | CSS | Uncompiled Sass shipped to production; missing post-processing (e.g. cssnano) for production bundles |
| `owasp-source-control` | Security | Secrets, keys, or `.env` committed; credentials in tracked config |
| `owasp-dependencies` | Security | Missing lockfiles, unpinned deps, no CVE scanning, unmaintained packages |
| `owasp-secure-libraries` | Security | Custom crypto/auth/encoding where framework primitives exist |
| `owasp-secure-build` | Security | Secrets in Dockerfiles/CI YAML; non-reproducible build steps; missing `composer audit`/`npm audit` in CI |
| `owasp-secure-deploy` | Security | Manual deploys; runtime secrets hard-coded instead of env/secrets manager |
| `owasp-defect-management` | Security | Security findings untracked or without remediation plan |
| `owasp-disclosure` | Security | Stack traces, exception strings, or **internal/security-control details** (referer, CSRF, token, header checks) in production user-facing flash messages, HTML, or API bodies |
| `twelve-factor-config` | 12-Factor | Hard-coded credentials, non-empty `.env*` with secrets, missing env vars |
| `twelve-factor-stateless` | 12-Factor | Durable state in local files, in-memory globals, or process-local storage |
| `twelve-factor-logs` | 12-Factor | `dump()`/`var_dump()` in prod paths; missing structured logging |
| `twelve-factor-ops` | 12-Factor | Maintenance logic in web controllers instead of console commands; build-time config baked into images instead of release/run injection |
| `symfony-validation` | Symfony | Request data persisted without `ValidatorInterface` or constraints |
| `symfony-controllers` | Symfony | Fat controllers, `$this->container->get()`, missing routing/security attributes, separate render/process actions when one suffices, **duplicate blocks across actions in the same class** |
| `symfony-services` | Symfony | Business logic in controllers; public app services; missing autowiring; custom application bundles; **services that mutate the HTTP request**; **`src/Dto/` classes that persist or flush via EntityManager** |
| `symfony-forms` | Symfony | Validation on form fields instead of entities/DTOs; submit buttons defined in form classes instead of templates |
| `symfony-security` | Symfony | Open `/api` or `/internal` routes; missing `access_control`; complex `#[IsGranted]` / `#[Security]` expression strings instead of voters |
| `symfony-i18n` | Symfony | Literal strings in `{% trans %}` instead of purpose-based keys; non-XLIFF translation files |
| `symfony-templates` | Symfony / Twig | Page templates without `{% extends %}`; PascalCase template paths; non-Bootstrap styling; inline `style=""`; user-visible literal copy without `{% trans %}` |
| `html-document` | HTML in Twig templates | Missing `<!DOCTYPE html>`; document shell in partials; wrong `<head>` order; `<base>`; explicit favicon link; protocol-relative external URLs; `type` on `<style>`/`<script>` |
| `html-composition` | HTML in Twig templates | Wrong `extends`/`include`/`embed` choice; parent scope leaked into partials; duplicate landmarks, `<h1>`, or `id` values across composed templates; layout logic in macros |
| `html-markup` | HTML in Twig templates | UPPERCASE tags (`<DIV>`, `<TABLE>`); mixed attribute quoting or casing; extra spaces in tags; `disabled="disabled"`; inconsistent void elements; unclosed tags; cramped list/table rows; poor HTML indentation |
| `html-semantics` | HTML in Twig templates | `<div>`/`<span>` over semantic elements; broken heading hierarchy; `<hgroup>`; misused `<address>`, `<blockquote>`, `<dl>`, or `<figure>`; `<br>` for layout; presentational tags |
| `html-links` | HTML in Twig templates | “Click here” link text; split links that should be grouped; missing `datetime` on `<time>` or `title` on `<abbr>` |
| `html-forms` | HTML in Twig templates | Missing CSRF; unlabeled controls; `placeholder` as sole label; wrong `button`/`input` type; missing `legend`/`title` on patterned inputs |
| `html-embedded` | HTML in Twig templates | Missing or wrong `alt`; `<picture>` without fallback `<img>`; non-empty `<iframe>`; `<td>` instead of `<th>` for headers |
| `html-escaping` | HTML in Twig templates | `\|raw` on untrusted data; unescaped dynamic attributes; disabled global auto-escaping; unescaped literal `&`/`<` in static markup |
| `html-a11y` | HTML in Twig templates | Redundant explicit ARIA roles on semantic elements; icon-only controls without accessible names; removed focus outlines |
| `symfony-assets` | Symfony | Manual asset includes where `AssetMapper` should be used |
| `symfony-deprecations` | Symfony (Deprecations) | Deprecated Symfony/Doctrine/third-party APIs; missing `trigger_deprecation()` when deprecating app code; `@`-suppressed notices; `failOnDeprecation` disabled or missing `deprecationTrigger` entries; unchecked compile-time deprecations after config/service changes |
| `api-rest` | API | Wrong HTTP methods, non-resource URLs, inconsistent status codes, missing List pagination, PUT vs PATCH misuse |
| `api-errors` | API | Unstructured error bodies, missing machine-readable codes, **one message for multiple independent validation failures** |
| `twig-style` | Twig | Spacing, delimiter, operator, macro, or indentation violations per Twig CS |
| `twig-naming` | Twig | Non-snake_case variables, filters, functions, macro args, or named args; HTML attribute casing (`id`/`class`/`name`) belongs under **HTML in Twig templates** |
| `pg-query-indexes` | PostgreSQL | Missing indexes on filter/JOIN/FK columns; wrong index type; suboptimal composite, partial, or covering indexes |
| `pg-schema` | PostgreSQL | Wrong column types; random UUID v4 PKs; mixed-case identifiers; missing FK indexes in migrations; **editing an already-shipped `Version*.php` instead of adding a new migration** |
| `pg-locking` | PostgreSQL | Long `EntityManager` transactions spanning external I/O; inconsistent lock ordering |
| `pg-pagination` | PostgreSQL | Deep `OFFSET` pagination instead of keyset/cursor pagination in repository queries |
| `pg-diagnostics` | PostgreSQL | Slow queries investigated without `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stat_statements`, or stale statistics from missing `VACUUM`/`ANALYZE` |
| `pg-data-access` | PostgreSQL | Row-by-row bulk inserts; superuser or over-privileged DB credentials; missing `FOR UPDATE SKIP LOCKED` on shared queue tables |
| `pg-advanced` | PostgreSQL | B-tree on JSONB; `LIKE '%term%'` instead of full-text search; missing GIN where appropriate |
| `doctrine-associations` | Doctrine ORM | Unnecessary bidirectional mappings; composite PKs; foreign-key columns mapped as entity fields |
| `doctrine-collections` | Doctrine ORM | Uninitialized collections; blanket `cascade` on all associations |
| `doctrine-lifecycle` | Doctrine ORM | Heavy lifecycle event listeners; implicit transactions instead of `wrapInTransaction()` |
| `doctrine-naming` | Doctrine ORM | Non-ASCII identifiers; quoted reserved words as table/column names |
| `doctrine-queries` | Doctrine ORM | DQL in controllers/entities; N+1 from lazy loading in loops; full entity hydration for read-only lists |

## Feedback format

Start with a one-line verdict: **Approve**, **Approve with nits**, or **Request changes**.

Add a short summary line: `**N findings** — 🔴 X critical · 🟡 Y suggestions · 🟢 Z nice-to-have`

Then list **every** finding by severity (highest first). Use this structure for each item.

When **Standard** is set, include an **Example** block quoting the matching rule from `examples/` (see **Rules for each finding**). Omit **Example** for pure logic bugs with no standards tie-in (e.g. finding #1 below).

```markdown
### 🔴 Critical — must fix before merge

#### 1. Missing authorization on delete
- **Location:** `src/Controller/OrderController.php:55`
- **Standard:** _(omit if not from coding-standards.mdc)_
- **Issue:** `deleteAction` removes orders without checking ownership; any authenticated user can delete another user's order.
- **Impact:** Data loss / unauthorized access.
- **Fix:** Add `denyAccessUnlessGranted('EDIT', $order)` before `$em->remove($order)`.

### 🟡 Suggestion — should consider

#### 2. Validation bypassed on create
- **Location:** `src/Controller/OrderController.php:22`
- **Standard:** `symfony-validation`
- **Issue:** Request body is persisted without running Symfony validation constraints.
- **Impact:** Invalid or malicious data can reach the database.
- **Example:** (`examples/symfony/controllers.php` — validate request data before business logic)
  - **Why:** Invalid input fails fast with consistent error responses.
  - **Don't do:**
    ```php
    $user = new User();
    $user->setEmail($request->request->get('email'));
    $this->em->persist($user); // before validation
    $errors = $validator->validate($user);
    ```
  - **Prefer:**
    ```php
    $user = new User();
    $user->setEmail((string) $request->request->get('email'));
    $errors = $validator->validate($user);
    if (count($errors) > 0) {
        return $this->render('register.html.twig', ['errors' => $errors]);
    }
    $this->userService->register($user);
    ```
- **Fix:** Validate with `#[MapRequestPayload]` + constraints, or `$validator->validate($dto)` before persist.

### 🟢 Nice to have — optional

#### 3. Redundant wrapper method
- **Location:** `src/Service/OrderService.php:88`
- **Standard:** `simplicity`
- **Issue:** `getOrderById()` only delegates to the repository with no added logic.
- **Impact:** Minor maintainability noise.
- **Example:** (`examples/general-principles.md` — prefer simple, readable solutions)
  - **Why:** The next maintainer reads code more than they write it; clarity beats brevity.
  - **Don't do:**
    ```javascript
    const total = items.reduce((a, i) => a + (i?.p?.d ?? 0) * (i?.q ?? 1), 0);
    ```
  - **Prefer:**
    ```javascript
    let total = 0;
    for (const item of items) {
        total += item.price * item.quantity;
    }
    ```
- **Fix:** Call the repository directly from the controller or add meaningful domain logic.
```

### Severity mapping

| Severity | When to use |
|----------|-------------|
| 🔴 Critical | Runtime errors, security vulnerabilities, data loss, authz gaps |
| 🟡 Suggestion | Best-practice violations, maintainability, performance implications |
| 🟢 Nice to have | Style, typos, minor improvements |

### Rules for each finding

- **Number every finding** across all severity sections (1, 2, 3, …) so nothing is lost.
- **Location** — use `file:line` when possible; add a `startLine:endLine:path` code citation for non-trivial snippets.
- **Standard** — use a label from the table above when the issue maps to `coding-standards.mdc`.
- **Issue** — describe what is wrong in plain language.
- **Impact** — state the consequence (bug, security risk, regression, maintainability, performance).
- **Example** — **required when Standard is set.** Locate the matching rule block in that label's scoped section's `examples/` file (from the **Rule examples** table in `coding-standards.mdc`). Include:
  - the examples file path in parentheses on the first line;
  - **Why** — one sentence from the rule block when it clarifies the fix;
  - **Don't do** and **Prefer** — quote the paired snippets from the examples file (trim to the lines relevant to this finding; use the same language/format as the source file).
  Omit **Example** only when the issue is a pure logic bug with no **Standard** label.
- **Fix** — tie the suggestion to the **Prefer** snippet and the changed code; avoid vague advice like "improve this."
- **Do not suppress findings** — report the full set; let the user prioritize.

### Positive patterns (when applicable)

After findings, add a brief section when warranted:

```markdown
### ✅ Positive patterns
- Clear separation of concerns in `OrderService`
- Proper CSRF protection on the delete form
- Comprehensive null checks on datetime parsing
```

## After the review

- If no issues: say so in one sentence and note any residual risk (e.g. untested edge case).
- If the diff is large, add a **Files reviewed** list so coverage is visible.
- Add **Checklist traceability** — for **every** Standard label in the table above (grep rows **and** manual-pass labels), list `N finding(s)` or `searched, no match` / `manual pass, no match`. Omitting a label means the checklist was not fully executed.
- Do not apply fixes unless the user asks.
- If the user wants automated review too, suggest `review-bugbot` or `review-security`.
