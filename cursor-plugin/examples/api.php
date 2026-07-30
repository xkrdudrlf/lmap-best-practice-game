<?php

declare(strict_types=1);

namespace App\Examples\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * API Endpoints — Rule Examples (coding-standards.mdc)
 * Each block: RULE, WHY, WHY NOT, DON'T DO, PREFER
 */

final class OrderApiExamples
{
    // =========================================================================
    // RULE: Resource-oriented URLs; standard HTTP methods (Get/List/Create/Update/Delete)
    // WHY: Predictable REST surface; clients cache and retry by verb semantics.
    // WHY NOT: RPC-style `/doDeleteOrder` over POST confuses caches and tooling.
    // =========================================================================

    // --- DON'T DO ---
    #[Route('/api/deleteOrder', methods: ['POST'])]
    public function deleteOrderBad(Request $request): JsonResponse
    {
        $id = $request->request->get('id');
        return new JsonResponse(['deleted' => $id]);
    }

    // --- PREFER ---
    #[Route('/api/orders/{orderId}', methods: ['DELETE'])]
    public function deleteOrderGood(string $orderId): Response
    {
        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    // =========================================================================
    // RULE: Plural resource names; consistent hierarchies; hyphens in paths
    // WHY: `/users/{userId}/orders` reads as nested collection membership.
    // WHY NOT: Singular `/user/order` mixes conventions and breaks client generators.
    // =========================================================================

    // --- DON'T DO ---
    // GET /api/user_order?userId=1

    // --- PREFER ---
    // GET /api/users/{userId}/orders

    // =========================================================================
    // RULE: Appropriate status codes; structured machine-readable errors
    // WHY: Clients branch on `code` without parsing English sentences.
    // WHY NOT: HTTP 200 with `{ "error": true }` breaks retries and monitoring.
    // =========================================================================

    // --- DON'T DO ---
    public function createBad(): JsonResponse
    {
        return new JsonResponse(['success' => false, 'message' => 'Bad email'], 200);
    }

    // --- PREFER ---
    public function createGood(): JsonResponse
    {
        return new JsonResponse([
            'code' => 'VALIDATION_FAILED',
            'message' => 'The email address is invalid.',
            'details' => [['field' => 'email', 'reason' => 'invalid_format']],
        ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    // =========================================================================
    // RULE: One failure reason per guard — distinct messages (or codes)
    // WHY: MQ consumers and API clients need the exact rule that failed for replay and support.
    // WHY NOT: `if (A || B) throw` with "A or B" hides which precondition was violated.
    // =========================================================================

    // --- DON'T DO ---
    public function rejectAssignmentBad(Registration $registration): void
    {
        if (
            $registration->getTrainingCommencedDatetime() === null ||
            $registration->getWithdrawnDatetime() !== null
        ) {
            throw new \RuntimeException('Assignment has not commenced or has been withdrawn.');
        }
    }

    // --- PREFER ---
    public function rejectAssignmentGood(Registration $registration): void
    {
        if ($registration->getTrainingCommencedDatetime() === null) {
            throw new \RuntimeException('Assignment has not commenced.');
        }
        if ($registration->getWithdrawnDatetime() !== null) {
            throw new \RuntimeException('Assignment has been withdrawn.');
        }
    }

    // =========================================================================
    // RULE: camelCase JSON fields; standard fields (name, createTime, updateTime)
    // WHY: Consistent serialization across services and OpenAPI docs.
    // WHY NOT: `created_at` in one endpoint and `createTime` in another frustrates SDKs.
    // =========================================================================

    // --- DON'T DO ---
    // { "order_id": 1, "created_at": "2026-01-01" }

    // --- PREFER ---
    // { "orderId": "1", "createTime": "2026-01-01T00:00:00Z" }

    // =========================================================================
    // RULE: Paginate List endpoints — pageSize / pageToken + nextPageToken
    // WHY: Unbounded lists OOM clients and databases.
    // WHY NOT: Returning 50k rows "because admin needs export" belongs on a separate export job.
    // =========================================================================

    // --- DON'T DO ---
    public function listAllBad(): JsonResponse
    {
        return new JsonResponse(['items' => /* all rows */ []]);
    }

    // --- PREFER ---
    public function listGood(Request $request): JsonResponse
    {
        $pageSize = min(100, (int) $request->query->get('pageSize', 25));
        $pageToken = $request->query->get('pageToken');
        return new JsonResponse([
            'orders' => [],
            'nextPageToken' => 'eyJpZCI6MTIzfQ==',
        ]);
    }

    // =========================================================================
    // RULE: PUT full replacement; PATCH partial update; idempotent mutators where possible
    // WHY: Retries safe for PUT/DELETE; PATCH limits accidental field wipes.
    // WHY NOT: POST for updates creates duplicate resources on duplicate submits.
    // =========================================================================

    // --- DON'T DO ---
    // POST /api/orders/5/update  { "status": "shipped" }

    // --- PREFER ---
    // PATCH /api/orders/5  { "status": "shipped" }

    // =========================================================================
    // RULE: Version APIs when breaking changes unavoidable
    // WHY: Mobile apps lag; `/v1` lets you ship `/v2` without bricking old clients.
    // WHY NOT: Silent field renames break deployed clients with no migration path.
    // =========================================================================

    // --- DON'T DO ---
    // Rename `totalCents` → `amount` in place with no version bump

    // --- PREFER ---
    // /api/v2/orders returns `amount`; /api/v1/orders keeps `totalCents` until sunset

    // =========================================================================
    // RULE: Do not expose implementation details in URLs
    // WHY: Stable resource ids survive storage refactors.
    // WHY NOT: `/api/tables/orders/rows/42` leaks schema; internal PK swaps break links.
    // =========================================================================

    // --- DON'T DO ---
    // GET /api/mysql/orders_table/primary_key/42

    // --- PREFER ---
    // GET /api/orders/42  (or opaque public id)
}
