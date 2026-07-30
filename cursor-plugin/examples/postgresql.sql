-- PostgreSQL — Rule Examples (coding-standards.mdc)
-- Each block: RULE, WHY, WHY NOT, DON'T DO, PREFER

-- =============================================================================
-- RULE: Index WHERE / JOIN / ORDER BY columns on large tables
-- WHY: Sequential scans degrade linearly as tables grow.
-- WHY NOT: Unindexed filters force full table reads on every list request.
-- =============================================================================

-- --- DON'T DO ---
-- SELECT * FROM orders WHERE status = 'pending' AND created_at > '2026-01-01';
-- (no index on status or created_at)

-- --- PREFER ---
CREATE INDEX idx_orders_status_created_at ON orders (status, created_at);

-- =============================================================================
-- RULE: Always index foreign-key columns
-- WHY: Postgres does not auto-index FKs; JOINs and cascades scan parent/child tables.
-- WHY NOT: Missing FK indexes make deletes on parent tables painfully slow.
-- =============================================================================

-- --- DON'T DO ---
-- order_items.order_id REFERENCES orders(id)  -- no index on order_id

-- --- PREFER ---
CREATE INDEX idx_order_items_order_id ON order_items (order_id);

-- =============================================================================
-- RULE: Composite indexes — equality columns first, then range (leftmost prefix)
-- WHY: B-tree composites only help queries that use leading columns.
-- WHY NOT: (created_at, status) won't accelerate WHERE status = 'pending' alone.
-- =============================================================================

-- --- DON'T DO ---
CREATE INDEX idx_bad ON events (created_at, user_id);

-- --- PREFER ---
CREATE INDEX idx_events_user_created ON events (user_id, created_at);

-- =============================================================================
-- RULE: Partial indexes for consistent filter predicates
-- WHY: Smaller index, faster scans when queries always include the same condition.
-- WHY NOT: Full index on deleted rows wastes space when soft-delete queries ignore them.
-- =============================================================================

-- --- DON'T DO ---
CREATE INDEX idx_users_email ON users (email);

-- --- PREFER ---
CREATE INDEX idx_users_active_email ON users (email) WHERE deleted_at IS NULL;

-- =============================================================================
-- RULE: Covering indexes (INCLUDE) for index-only scans
-- WHY: Avoids heap fetches when SELECT columns are in the index.
-- WHY NOT: Filtering on id then fetching name from heap doubles I/O.
-- =============================================================================

-- --- DON'T DO ---
-- SELECT id, name FROM products WHERE category_id = 5;
-- INDEX ON (category_id) only

-- --- PREFER ---
CREATE INDEX idx_products_category_cover ON products (category_id) INCLUDE (name);

-- =============================================================================
-- RULE: Choose index type — B-tree, GIN, GiST, BRIN
-- WHY: JSONB containment and full-text need GIN, not default B-tree.
-- WHY NOT: B-tree on jsonb column cannot accelerate @> queries.
-- =============================================================================

-- --- DON'T DO ---
CREATE INDEX idx_meta_btree ON documents (metadata); -- jsonb

-- --- PREFER ---
CREATE INDEX idx_meta_gin ON documents USING GIN (metadata);

-- =============================================================================
-- RULE: lowercase snake_case tables and columns
-- WHY: Matches Doctrine defaults; avoids quoted identifier pain.
-- WHY NOT: "UserOrders" requires quotes everywhere and breaks on Linux vs Windows dumps.
-- =============================================================================

-- --- DON'T DO ---
CREATE TABLE "UserOrders" ("userId" BIGINT);

-- --- PREFER ---
CREATE TABLE user_orders (user_id BIGINT);

-- =============================================================================
-- RULE: bigint auto-increment PKs; avoid random UUID v4 PKs on large tables
-- WHY: Sequential bigint keeps indexes compact; random UUIDs fragment B-trees.
-- WHY NOT: UUID v4 PK inserts cause hot page splits and bloated indexes at scale.
-- =============================================================================

-- --- DON'T DO ---
CREATE TABLE events (id UUID PRIMARY KEY DEFAULT gen_random_uuid());

-- --- PREFER ---
CREATE TABLE events (id BIGSERIAL PRIMARY KEY);

-- =============================================================================
-- RULE: Appropriate column types — text, timestamptz, decimal for money
-- WHY: Correct types enforce range and precision at the database layer.
-- WHY NOT: float for money causes rounding errors; varchar(255) caps text arbitrarily.
-- =============================================================================

-- --- DON'T DO ---
CREATE TABLE invoices (total DOUBLE PRECISION, note VARCHAR(255));

-- --- PREFER ---
CREATE TABLE invoices (total NUMERIC(12, 2), note TEXT);

-- =============================================================================
-- RULE: NOT NULL, UNIQUE, CHECK, FK constraints
-- WHY: DB enforces invariants even when application bugs slip through.
-- WHY NOT: Nullable everything pushes integrity checks to every query path.
-- =============================================================================

-- --- DON'T DO ---
CREATE TABLE users (email TEXT);

-- --- PREFER ---
CREATE TABLE users (
  email TEXT NOT NULL UNIQUE,
  age INT CHECK (age >= 0)
);

-- =============================================================================
-- RULE: Keep transactions short — no external I/O inside locks
-- WHY: Long transactions hold row locks and block other workers.
-- WHY NOT: HTTP call inside BEGIN blocks checkout for all users on that row.
-- =============================================================================

-- --- DON'T DO ---
-- BEGIN; SELECT ... FOR UPDATE; -- call payment API for 30s -- COMMIT;

-- --- PREFER ---
-- Validate + charge API first, then wrapInTransaction() for DB writes only

-- =============================================================================
-- RULE: Consistent lock ordering across concurrent updates
-- WHY: Prevents deadlock cycles when two transactions lock rows in opposite order.
-- WHY NOT: Tx A locks user then order; Tx B locks order then user → deadlock.
-- =============================================================================

-- --- DON'T DO ---
-- Thread 1: UPDATE accounts SET ... WHERE id = 1; UPDATE accounts WHERE id = 2;
-- Thread 2: UPDATE accounts WHERE id = 2; UPDATE accounts WHERE id = 1;

-- --- PREFER ---
-- Always lock rows in ascending id order in application code

-- =============================================================================
-- RULE: Keyset/cursor pagination over deep OFFSET
-- WHY: OFFSET 100000 still scans and discards 100k rows.
-- WHY NOT: Page 5000 on OFFSET pagination times out as data grows.
-- =============================================================================

-- --- DON'T DO ---
SELECT * FROM messages ORDER BY id LIMIT 20 OFFSET 100000;

-- --- PREFER ---
SELECT * FROM messages WHERE id > :last_id ORDER BY id LIMIT 20;

-- =============================================================================
-- RULE: EXPLAIN (ANALYZE, BUFFERS) and pg_stat_statements for slow queries
-- WHY: Evidence-based tuning beats guessing which index to add.
-- WHY NOT: Adding random indexes without EXPLAIN can slow writes with no read benefit.
-- =============================================================================

-- --- DON'T DO ---
-- "Query is slow" → CREATE INDEX on every column

-- --- PREFER ---
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = 42 AND status = 'open';

-- =============================================================================
-- RULE: Batch inserts over row-by-row in bulk paths
-- WHY: One round-trip and one WAL flush batch amortizes fsync cost.
-- WHY NOT: 10k single-row INSERTs in a loop dominate migration/fixture runtime.
-- =============================================================================

-- --- DON'T DO ---
-- INSERT INTO log_entries (msg) VALUES ('a'); -- repeated 10000 times

-- --- PREFER ---
INSERT INTO log_entries (msg) VALUES ('a'), ('b'), ('c');

-- =============================================================================
-- RULE: Least-privilege DB user (no superuser)
-- WHY: Compromised app credentials cannot DROP DATABASE or read other schemas.
-- WHY NOT: Superuser in web app DSN is full cluster compromise on SQL injection.
-- =============================================================================

-- --- DON'T DO ---
-- GRANT ALL PRIVILEGES ON DATABASE app TO webapp;

-- --- PREFER ---
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO webapp;

-- =============================================================================
-- RULE: FOR UPDATE SKIP LOCKED on shared queue dequeue
-- WHY: Multiple workers grab distinct rows without blocking each other.
-- WHY NOT: FOR UPDATE without SKIP LOCKED serializes workers on the same head row.
-- =============================================================================

-- --- DON'T DO ---
SELECT * FROM jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE;

-- --- PREFER ---
SELECT * FROM jobs
WHERE status = 'pending'
ORDER BY id
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- =============================================================================
-- RULE: Full-text search with tsvector + GIN, not LIKE '%term%'
-- WHY: GIN-backed FTS scales; leading-wildcard LIKE cannot use B-tree.
-- WHY NOT: LIKE '%foo%' on millions of rows is a sequential scan every time.
-- =============================================================================

-- --- DON'T DO ---
SELECT * FROM articles WHERE body LIKE '%postgresql%';

-- --- PREFER ---
SELECT * FROM articles
WHERE search_vector @@ plainto_tsquery('english', 'postgresql');

-- =============================================================================
-- RULE: Never edit migrations that may already have run — add a new Version*.php
-- WHY: doctrine_migration_versions records executed class names; re-running changed files is skipped.
-- WHY NOT: In-place CREATE TABLE / ALTER edits leave deployed DBs missing columns, FKs, and indexes.
-- =============================================================================

-- --- DON'T DO ---
-- Edit Version20260129000004.php on a branch where staging already ran the old file:
--   CREATE TABLE emergency_contact (..., relationship TEXT NOT NULL, PRIMARY KEY(id))
-- becomes
--   CREATE TABLE emergency_contact (..., relationship TEXT NOT NULL,
--     created_on_datetime TIMESTAMP NOT NULL, invalid_on_datetime TIMESTAMP, PRIMARY KEY(id))
-- (existing environments never get the new columns)

-- --- PREFER ---
-- New file Version20260706120000.php:
-- ALTER TABLE emergency_contact ADD created_on_datetime TIMESTAMP NOT NULL DEFAULT NOW();
-- ALTER TABLE emergency_contact ADD invalid_on_datetime TIMESTAMP DEFAULT NULL;
-- ALTER TABLE cart_item ADD emergency_contact_id INT DEFAULT NULL;
-- CREATE INDEX ... ON cart_item (emergency_contact_id);
-- ALTER TABLE cart_item ADD CONSTRAINT ... FOREIGN KEY (emergency_contact_id) REFERENCES emergency_contact (id);
