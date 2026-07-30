# Symfony templates & i18n — Rule Examples

See also `symfony/controllers.php` and `html-twig/`.

---

## Rule: snake_case Twig template names; prefix partials with `_`

**Why:** Matches Symfony defaults and distinguishes page templates from fragments.

**Why not:** `OrderRow.html.twig` mixed with `order_row.html.twig` breaks convention-based discovery.

### Don't do

```
templates/Order/OrderRow.html.twig
templates/partials/card.html.twig
```

### Prefer

```
templates/order/order_row.html.twig
templates/order/_card.html.twig
```

---

## Rule: Bootstrap for styling; no inline CSS

**Why:** Shared design system; CSP-friendly; themes update in one place.

**Why not:** `style="margin-top:12px"` on every element blocks dark mode and utility refactors.

### Don't do

```twig
<div style="padding: 1rem; background: #f0f0f0;">{{ content }}</div>
```

### Prefer

```twig
<div class="card p-3 bg-light">{{ content }}</div>
```

---

## Rule: Wrap user-facing text in `{% trans %}`; purpose-based keys

**Why:** Translators work on stable keys; literal English in keys breaks when copy changes.

**Why not:** `{% trans %}Edit your profile{% endtrans %}` forces key churn when marketing rewrites copy.

### Don't do

```twig
{% trans %}Welcome back, friend!{% endtrans %}
{# key is the English sentence #}
```

### Prefer

```twig
{% trans %}dashboard.greeting{% endtrans %}
{# messages.en.xlf: dashboard.greeting → "Welcome back, friend!" #}
```

---

## Rule: XLIFF translation files

**Why:** Standard format for translation tools and Symfony workflow.

**Why not:** ad-hoc `.yaml` or `.json` translation files lose translator ecosystem support.

### Don't do

```yaml
# translations/messages.en.yaml
dashboard.greeting: Welcome
```

### Prefer

```xml
<!-- translations/messages.en.xlf -->
<trans-unit id="dashboard.greeting">
  <source>dashboard.greeting</source>
  <target>Welcome</target>
</trans-unit>
```

---

## Rule: AssetMapper for web assets

**Why:** Symfony-native asset pipeline without manual script tags per page.

**Why not:** Hard-coded `<script src="/build/old-hash.js">` rots after every deploy.

### Don't do

```twig
<script src="/assets/app-abc123.js"></script>
<link rel="stylesheet" href="/css/manual.css">
```

### Prefer

```twig
{% block javascripts %}
  {{ importmap('app') }}
{% endblock %}
```

---

## Rule: Voters when `#[Security]` expressions grow complex

**Why:** Voters are testable PHP classes with clear subject/action API.

**Why not:** `'is_granted("ROLE_ADMIN") or (user.getTeam() and ...)'` strings are opaque and untested.

### Don't do

```php
#[Security("is_granted('ROLE_ADMIN') or (user.getTeam() and subject.getTeam() == user.getTeam())")]
```

### Prefer

```php
#[IsGranted('EDIT', subject: 'order')]
// OrderVoter::voteOnAttribute() encapsulates team membership logic
```

---

## Rule: Functional tests hard-code URLs so route renames fail tests

**Why:** Tests catch broken bookmarks and API clients when routes change.

**Why not:** Generating URLs only in prod code means renames slip through CI.

### Don't do

```php
$client->request('GET', $router->generate('product_show', ['id' => 1]));
```

### Prefer

```php
$client->request('GET', '/products/1');
self::assertResponseIsSuccessful();
```
