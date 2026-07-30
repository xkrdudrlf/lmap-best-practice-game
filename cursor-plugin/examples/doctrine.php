<?php

declare(strict_types=1);

namespace App\Examples\Doctrine;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping as ORM;

/**
 * Doctrine ORM — Rule Examples (coding-standards.mdc)
 */

// =============================================================================
// RULE: Constrain relationships; prefer unidirectional; avoid unnecessary bidirectional
// WHY: Fewer inverse sides means less sync logic and smaller object graphs.
// WHY NOT: Bidirectional everywhere forces you to maintain both sides on every add/remove.
// =============================================================================

// --- DON'T DO ---
#[ORM\Entity]
class OrderBad
{
    #[ORM\OneToMany(mappedBy: 'order', targetEntity: OrderItemBad::class)]
    private Collection $items;

    #[ORM\ManyToOne(inversedBy: 'orders', targetEntity: CustomerBad::class)]
    private CustomerBad $customer;
}

// --- PREFER ---
#[ORM\Entity]
class OrderGood
{
    #[ORM\OneToMany(mappedBy: 'order', targetEntity: OrderItemGood::class)]
    private Collection $items;

    #[ORM\ManyToOne(targetEntity: CustomerGood::class)]
    private CustomerGood $customer;
}

// =============================================================================
// RULE: Avoid composite primary keys
// WHY: Surrogate keys simplify repositories, caching, and URL identifiers.
// WHY NOT: Composite PK entities are painful in forms, APIs, and merge operations.
// =============================================================================

// --- DON'T DO ---
// #[ORM\Id] #[ORM\Column] private int $tenantId;
// #[ORM\Id] #[ORM\Column] private int $userId;

// --- PREFER ---
// #[ORM\Id] #[ORM\GeneratedValue] #[ORM\Column] private ?int $id = null;

// =============================================================================
// RULE: Do not map FK columns as entity fields — use associations
// WHY: Doctrine owns the FK column; duplicate fields can desync from relation.
// WHY NOT: `$orderId` + `$order` can disagree after partial hydration.
// =============================================================================

// --- DON'T DO ---
#[ORM\Entity]
class OrderItemBad
{
    #[ORM\Column]
    private int $orderId;

    #[ORM\ManyToOne(targetEntity: OrderBad::class)]
    private OrderBad $order;
}

// --- PREFER ---
#[ORM\Entity]
class OrderItemGood
{
    #[ORM\ManyToOne(targetEntity: OrderGood::class, inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false)]
    private OrderGood $order;
}

// =============================================================================
// RULE: ASCII-only identifiers; avoid quoted reserved words
// WHY: Quoted identifiers are case-sensitive and break across databases.
// WHY NOT: Table `order` or column `user` requires quotes and confuses SQL generators.
// =============================================================================

// --- DON'T DO ---
// #[ORM\Table(name: '"order"')]

// --- PREFER ---
// #[ORM\Table(name: 'orders')]

// =============================================================================
// RULE: Initialize collections in constructor
// WHY: Business code can call ->add() without null checks.
// WHY NOT: Uninitialized Collection causes TypeError on first add in production.
// =============================================================================

// --- DON'T DO ---
#[ORM\Entity]
class CartBad
{
    #[ORM\OneToMany(mappedBy: 'cart', targetEntity: CartLineBad::class)]
    private Collection $lines; // never initialized
}

// --- PREFER ---
#[ORM\Entity]
class CartGood
{
    #[ORM\OneToMany(mappedBy: 'cart', targetEntity: CartLineGood::class)]
    private Collection $lines;

    public function __construct()
    {
        $this->lines = new ArrayCollection();
    }
}

// =============================================================================
// RULE: cascade persist/remove only where association lifecycle requires it
// WHY: Blanket cascade deletes children you meant to orphan or audit.
// WHY NOT: cascade: ['remove'] on every relation causes surprise mass deletes.
// =============================================================================

// --- DON'T DO ---
// #[ORM\OneToMany(..., cascade: ['persist', 'remove', 'merge', 'detach'])]

// --- PREFER ---
// #[ORM\OneToMany(..., cascade: ['persist'])]  // only when child cannot exist alone

// =============================================================================
// RULE: Lifecycle events sparingly — heavy listeners hurt flush performance
// WHY: Every flush triggers listeners; side effects multiply mysteriously.
// WHY NOT: Computing aggregates in PreUpdate on every field tweak tanks throughput.
// =============================================================================

// --- DON'T DO ---
// #[AsEntityListener(event: Events::preUpdate)]
// heavy external API sync on every column change

// --- PREFER ---
// Explicit domain service method updates aggregates when business event occurs

// =============================================================================
// RULE: Explicit wrapInTransaction() boundaries
// WHY: Clear atomic unit; easier to reason about than implicit autocommit per query.
// WHY NOT: Implicit transactions hide partial failure states across multiple flushes.
// =============================================================================

final class TransferService
{
    public function __construct(private EntityManagerInterface $em) {}

    public function transfer(Account $from, Account $to, int $cents): void
    {
        // --- DON'T DO ---
        // $from->debit($cents);
        // $this->em->flush();
        // $to->credit($cents); // if this fails, debit already committed

        // --- PREFER ---
        $this->em->wrapInTransaction(function () use ($from, $to, $cents): void {
            $from->debit($cents);
            $to->credit($cents);
        });
    }
}

// =============================================================================
// RULE: DQL/query builder in repositories, not controllers or entities
// WHY: Persistence queries live beside the aggregate they load.
// WHY NOT: SQL strings in controllers spread data access and block reuse.
// =============================================================================

// --- DON'T DO ---
// In controller: $em->createQuery('SELECT u FROM App\Entity\User u')->getResult();

// --- PREFER ---
// UserRepository::findActiveSubscribers(): array

// =============================================================================
// RULE: Eliminate N+1 with fetch joins when iterating associations
// WHY: One query loads the graph; lazy loading in loops is O(n) queries.
// WHY NOT: 50 orders × lazy customer = 51 queries per page view.
// =============================================================================

// --- DON'T DO ---
// foreach ($orders as $order) { $order->getCustomer()->getName(); }

// --- PREFER ---
// $qb->join('o.customer', 'c')->addSelect('c')

// =============================================================================
// RULE: Do not repeat identical repository lookups inside loops
// WHY: Same find* arguments every iteration still execute O(n) queries.
// WHY NOT: 30 registrations × identical trainingComponent lookup = 30 wasted round-trips.
// =============================================================================

// --- DON'T DO ---
// foreach ($rows as $row) {
//     $outcome = $repo->findOneByTrainingComponentAndOutcome($trainingComponent, $row['outcome']);
// }

// --- PREFER (batch — one query for all distinct keys) ---
// $outcomeNames = array_unique(array_column($rows, 'outcome'));
// $outcomes = $repo->findByTrainingComponentAndOutcomeNames($trainingComponent, $outcomeNames);
// $byName = []; foreach ($outcomes as $o) { $byName[$o->getOutcome()->getName()] = $o; }
// foreach ($rows as $row) { $outcome = $byName[$row['outcome']]; }

// --- AVOID (??= cache — still one query per distinct key) ---
// foreach ($rows as $row) {
//     $cache[$row['outcome']] ??= $repo->findOneByTrainingComponentAndOutcome($trainingComponent, $row['outcome']);
// }

// =============================================================================
// RULE: DTO / array hydration for read-only lists
// WHY: Full entities carry change tracking overhead you do not need on list screens.
// WHY NOT: Hydrating 500 entities with collections allocates memory for write paths you skip.
// =============================================================================

// --- DON'T DO ---
// return $qb->getQuery()->getResult(); // full Order entities for a table view

// --- PREFER ---
// SELECT NEW App\Dto\OrderRowDto(o.id, o.total, c.name) ...
// or getArrayResult() for simple projections

// Placeholder entity stubs for examples above
#[ORM\Entity]
class OrderItemBad {}
#[ORM\Entity]
class CustomerBad {}
#[ORM\Entity]
class CustomerGood {}
#[ORM\Entity]
class CartLineBad {}
#[ORM\Entity]
class CartLineGood {}
#[ORM\Entity]
class Account
{
    public function debit(int $cents): void {}
    public function credit(int $cents): void {}
}
