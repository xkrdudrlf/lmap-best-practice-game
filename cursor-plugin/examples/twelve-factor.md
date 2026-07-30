# 12-Factor — Rule Examples

---

## Rule: Store config in environment variables, not hard-coded values

**Why:** Same artifact runs in dev, staging, and prod with different config.

**Why not:** Hard-coded URLs and keys require rebuilds per environment and leak in source.

### Don't do

```php
$pdo = new PDO('mysql:host=prod-db.internal;dbname=app', 'root', 'hunter2');
```

### Prefer

```php
// config/packages/doctrine.yaml
// url: '%env(resolve:DATABASE_URL)%'
```

---

## Rule: Keep `.env*` empty except comments; inject real values at runtime

**Why:** Developers clone repos; empty templates prevent accidental secret commits.

**Why not:** `.env.local` with prod-like secrets gets committed when someone runs `git add .`.

### Don't do

```dotenv
# .env
DATABASE_URL=postgresql://user:realpassword@localhost:5432/app
```

### Prefer

```dotenv
# .env — committed template
###> doctrine/doctrine-bundle ###
DATABASE_URL=
###< doctrine/doctrine-bundle ###
```

---

## Rule: Symfony secrets / env for sensitive values; `app.` prefix for behavior params

**Why:** Separates secrets from tunable application parameters in `services.yaml`.

**Why not:** Mixing API keys with `app.pagination_size` in one flat config file blurs rotation policy.

### Don't do

```yaml
# services.yaml
parameters:
  stripe.secret: sk_live_abc
  app.items_per_page: 25
```

### Prefer

```yaml
# services.yaml
parameters:
  app.items_per_page: 25
# .env: STRIPE_SECRET=  (or secrets vault)
```

---

## Rule: Design processes as stateless; durable state in backing services

**Why:** Horizontal scaling requires any instance to handle any request.

**Why not:** In-memory session carts or file-based locks break with multiple app servers.

### Don't do

```php
// Global in-memory cache of user permissions for the whole PHP process
static $permissionsCache = [];
```

### Prefer

```php
// Redis / database session store; permissions loaded per request or cached in Redis
```

---

## Rule: Backing services as attached resources swappable via config

**Why:** Switch Postgres vendor or mail provider without code changes.

**Why not:** `new SmtpTransport('mail.internal')` in business code blocks migration.

### Don't do

```php
$mailer = new SmtpTransport('192.168.1.50', 25);
```

### Prefer

```yaml
# config/packages/mailer.yaml
# dsn: '%env(MAILER_DSN)%'
```

---

## Rule: Logs as event streams — structured stdout/stderr; no dump() in prod

**Why:** Platforms aggregate stdout; structured JSON parses in Datadog/ELK.

**Why not:** `var_dump` in responses leaks data and bypasses log retention policies.

### Don't do

```php
public function show(Order $order): Response
{
    dump($order); // web profiler leak in prod misconfig
    return $this->json($order);
}
```

### Prefer

```php
$this->logger->info('Order viewed', ['order_id' => $order->getId()]);
```

---

## Rule: Admin/maintenance as one-off console processes, not web requests

**Why:** Long jobs exceed HTTP timeouts and tie up web workers.

**Why not:** `/admin/rebuild-cache?secret=xyz` is an unauthenticated DoS vector waiting to happen.

### Don't do

```php
#[Route('/internal/reindex', methods: ['POST'])]
public function reindex(): Response
{
    $this->searchIndexer->reindexAll(); // 20 minutes
    return new Response('ok');
}
```

### Prefer

```bash
php bin/console app:search:reindex
```

---

## Rule: Dev/prod parity for dependencies, config keys, backing services

**Why:** "Works on my machine" bugs surface only after deploy.

**Why not:** SQLite in dev + Postgres in prod hides JSON operator and migration differences.

### Don't do

```yaml
# doctrine.yaml — env-specific entirely different drivers without parity plan
```

### Prefer

```yaml
# Same DATABASE_URL shape locally (Docker Compose) and in production
```

---

## Rule: Separate build, release, and run — compile at build; inject config at release/run

**Why:** Immutable releases; config changes don't require recompilation.

**Why not:** Baking `APP_ENV=prod` and API URLs into compiled JS at dev time blocks promotion.

### Don't do

```dockerfile
RUN npm run build
ENV API_BASE=https://staging.api.example.com  # baked into wrong stage
```

### Prefer

```dockerfile
# build stage: npm run build (no secrets)
# release: tag image + inject env at deploy
# run: container starts with runtime env vars
```
