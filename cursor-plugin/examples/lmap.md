# LMAP — Rule Examples

Company-specific conventions for the LMAP codebase. Not part of generic coding standards.

---

## Rule: `getEntityById` labels must match the entity class and sibling call sites

**Why:** `DoctrineTrait::getEntityById` embeds `$name` in exception messages; inconsistent labels confuse operators and hide which entity failed to load.

**Why not:** Legacy UI terms (`training module`) or raw class names (`TrainingComponentInstance`) mixed with sentence-case labels (`training component instance`) for the same `::class` produce misleading errors and drift from the domain model.

### Don't do

```php
// Same file — TrainingComponentInstance::class with three different labels
$trainingComponentInstance = $this->getEntityById(
    TrainingComponentInstance::class,
    'training component instance',
    'id',
    $id
);
// …
$trainingComponentInstance = $this->getEntityById(
    TrainingComponentInstance::class,
    'training module', // legacy UI slang — wrong entity label in exceptions
    'id',
    $id
);
// …
$trainingComponentInstance = $this->getEntityById(
    TrainingComponentInstance::class,
    'TrainingComponentInstance', // PascalCase class name, not a human label
    'id',
    $id
);
```

### Prefer

```php
// One canonical lower sentence-case label per entity class in the file
$trainingComponentInstance = $this->getEntityById(
    TrainingComponentInstance::class,
    'training component instance',
    'id',
    $id
);
```
