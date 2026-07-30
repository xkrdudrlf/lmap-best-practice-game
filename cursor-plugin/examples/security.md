# Security (OWASP) — Rule Examples

---

## Rule: Secure source control — never commit secrets or `.env`

**Why:** Git history is forever; scanners and clones expose credentials instantly.

**Why not:** Leaked API keys mean account takeover, data breach, and emergency rotation at 3am.

### Don't do

```gitignore
# .env committed with real values
DATABASE_URL=postgresql://admin:SuperSecret@db:5432/app
STRIPE_SECRET=sk_live_...
```

### Prefer

```gitignore
# .gitignore
.env
.env.local
*.pem
```

```bash
# .env.example (committed, no secrets)
DATABASE_URL=
STRIPE_SECRET=
```

---

## Rule: Dependencies — lockfiles, pinned versions, CVE scanning

**Why:** Reproducible builds and known-vulnerability alerts protect the supply chain.

**Why not:** Floating `^` without lockfiles deploy different code per machine; CVEs go unnoticed.

### Don't do

```json
// package.json only, no package-lock.json in repo
"dependencies": { "lodash": "*" }
```

### Prefer

```bash
composer install --no-dev   # uses composer.lock
npm ci                      # uses package-lock.json
composer audit && npm audit
```

---

## Rule: Secure libraries — use framework primitives, not custom crypto

**Why:** Symfony Security, `password_hash`, Doctrine binding, and Twig escaping are battle-tested.

**Why not:** Home-grown AES/RBAC/hash schemes have subtle flaws professionals spend careers avoiding.

### Don't do

```php
$token = base64_encode(md5($userId . 'secret_salt'));
$passwordHash = hash('sha256', $password);
```

### Prefer

```php
$token = $csrfTokenManager->getToken('authenticate')->getValue();
$passwordHash = $passwordHasher->hashPassword($user, $plainPassword);
```

---

## Rule: Secure build — reproducible, no secrets in Docker/CI YAML

**Why:** Pipelines are logged and forked; secrets in YAML end up in artifact caches.

**Why not:** `ENV API_KEY=sk_live` in Dockerfile bakes keys into every image layer.

### Don't do

```dockerfile
ENV STRIPE_SECRET=sk_live_abc123
```

```yaml
# .github/workflows/deploy.yml
env:
  DB_PASSWORD: production_password_here
```

### Prefer

```yaml
env:
  STRIPE_SECRET: ${{ secrets.STRIPE_SECRET }}
steps:
  - run: composer audit --no-dev
  - run: npm audit --audit-level=moderate
```

---

## Rule: Error disclosure — no stack traces or internals in production responses

**Why:** Attackers map frameworks, paths, and versions from verbose errors.

**Why not:** `SQLSTATE[23505]: Duplicate key` + file paths leak schema and code layout.

### Don't do

```json
{
  "error": "PDOException: SQLSTATE[23505] duplicate key value violates unique constraint \"users_email_key\" in /var/www/src/Repository/UserRepository.php:42\n#0 ..."
}
```

### Prefer

```json
{
  "code": "CONFLICT",
  "message": "A user with this email already exists."
}
```

---

## Rule: Error disclosure — generic flash messages on public routes

**Why:** Flash messages on `src/Controller/Public/**` are shown to unauthenticated or external users. Naming the guard that failed (referer, CSRF, token, header) helps attackers tune bypass attempts and maps internal controls.

**Why not:** `'Invalid request: a same-host referer is required…'` tells the client exactly which check failed and how to satisfy it.

### Don't do

```php
// Public controller — reveals referer validation and same-host rule
if (is_null($this->urlUtil->getSafeReferer($request))) {
    $this->logger->warning('addCartItem rejected: untrusted referer', [/* context */]);
    $this->addFlash(
        'danger',
        'Invalid request: a same-host referer is required to add a training item to the cart.'
    );
    return $this->redirectToRoute('get_training_registration_search');
}
```

### Prefer

```php
if (is_null($this->urlUtil->getSafeReferer($request))) {
    $this->logger->warning('addCartItem rejected: untrusted referer', [/* full context for ops */]);
    $this->addFlash('danger', 'Invalid request');
    return $this->redirectToRoute('get_training_registration_search');
}
```

Use the same generic copy for **all sibling actions** in the class that share the same guard (`deleteCartItems`, `changeCartItem`, etc.).
