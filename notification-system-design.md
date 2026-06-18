# Notification System Design

## Stage 1 — API Contract (REST)

Overview: students receive real-time notifications of three types: `Placement`, `Result`, `Event`.

API endpoints (HTTP/JSON):

- `GET /api/notifications?studentId={id}&limit={n}&after={cursor}`
  - Query params: `studentId` (required), `limit` (optional, default 20), `after` (cursor for pagination)
  - Response: 200 `{ notifications: [ { id, type, message, isRead, createdAt } ], nextCursor }`

- `GET /api/notifications/unread?studentId={id}`
  - Returns unread count and list (paginated)
  - Response: 200 `{ count, notifications: [...] }`

- `POST /api/notifications/mark-read`
  - Body: `{ studentId, notificationIds: [id] }`
  - Response: 200 `{ updated: n }`

- `POST /api/notifications` (internal use / admin)
  - Body: `{ studentId, type: "Placement|Result|Event", message }`
  - Response: 201 `{ id }`

Real-time contract:

- Use WebSocket (recommended) or Server-Sent Events to push new notifications to connected students.
- When a new notification is created, service will: save to DB, push to student's WS channel, and enqueue email job.

Enum:

- `notification_type`: `Placement`, `Result`, `Event`

Status codes and errors:

- `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized` (not used in this evaluation), `500 Internal Server Error`.

Notes:

- All API implementations MUST use the project's `logging-middleware` for structured logs (no direct `console.log`).

## Stage 2 — Persistent Storage (DB) & Schema

1. DB choice and rationale

- Recommended: PostgreSQL (relational) — reasons:
  - Strong consistency and transactional guarantees (important for read/unread state)
  - Mature indexing and query planner; supports JSON columns if needed
  - Easy to scale with read replicas and partitioning
  - Wide ecosystem and tooling (pg, backups, migrations)

2. Schema (normalized)

CREATE TABLE students (
id SERIAL PRIMARY KEY,
roll_number VARCHAR(32) UNIQUE NOT NULL,
email VARCHAR(255) NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TYPE notification_type AS ENUM ('Placement','Result','Event');

CREATE TABLE notifications (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
student_id INTEGER NOT NULL REFERENCES students(id),
notification_type notification_type NOT NULL,
message TEXT NOT NULL,
is_read BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

3. Indexes

- Index on `(student_id, is_read, created_at DESC)` to support fetching unread per student ordered by newest:
  `CREATE INDEX idx_notifications_student_unread ON notifications (student_id, is_read, created_at DESC);`
- Index on `notification_type, created_at` for time-window queries on a type:
  `CREATE INDEX idx_notifications_type_time ON notifications (notification_type, created_at DESC);`

4. Sample queries (map to Stage 1 APIs)

- Fetch recent notifications (paginated):

  ```sql
  SELECT id, notification_type, message, is_read, created_at
  FROM notifications
  WHERE student_id = $1
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3;
  ```

- Fetch unread notifications count + recent unread:

  ```sql
  SELECT count(*) FROM notifications WHERE student_id = $1 AND is_read = false;

  SELECT id, notification_type, message, created_at
  FROM notifications
  WHERE student_id = $1 AND is_read = false
  ORDER BY created_at DESC
  LIMIT 50;
  ```

- Mark notifications as read (batch):
  ```sql
  UPDATE notifications
  SET is_read = true
  WHERE student_id = $1 AND id = ANY($2::uuid[]);
  ```

5. Scalability concerns & mitigations (as data grows)

- Problem: Table growth (millions of rows) slows full-table scans and increases index size.
  - Mitigation: Partition `notifications` by range on `created_at` (monthly partitions) to keep indexes smaller.
- Problem: Hot student (very active) creating write/read hotspots.
  - Mitigation: Use Redis cache for recent unread notifications per student; keep cache TTL short and invalidate on write.
- Problem: Large inserts for "Notify All" (50k inserts) could lock or slow DB.
  - Mitigation: Use bulk inserts in transactions, or push writes to a job queue and parallel worker pool to smooth load.
- Problem: Backup & restore times as DB grows.
  - Mitigation: Use incremental backups, logical replication, and offload analytics to a data warehouse.

6. NoSQL alternative (if chosen)

- If very high write throughput and relaxed relational constraints required, consider Cassandra or DynamoDB with a table keyed by `student_id` and time-series sorted by timestamp. This trades relational joins for write/read scalability but complicates transactional updates (marking read).

## Stage 3 — Query Optimization & Index Strategy

1. Is the query accurate?

- The query is logically correct for fetching unread notifications for a student:

  ```sql
  SELECT * FROM notifications
  WHERE studentID = 1042 AND isRead = false
  ORDER BY createdAt ASC;
  ```

- However, it is not optimal for production because it uses `SELECT *`, a sort on potentially many rows, and it depends on column names that may not match the schema exactly (`student_id`, `is_read`, `created_at` in the proposed schema).

2. Why is it slow?

- It may scan many rows if there is no composite index on `(student_id, is_read, created_at)`.
- Sorting becomes expensive if the database cannot use an index that matches the `ORDER BY` clause.
- `SELECT *` transfers more data than necessary.

3. What would change?

- Use a composite covering index:

  ```sql
  CREATE INDEX idx_notifications_unread_feed
  ON notifications (student_id, is_read, created_at ASC);
  ```

- Select only required columns and add pagination:

  ```sql
  SELECT id, notification_type, message, created_at
  FROM notifications
  WHERE student_id = $1 AND is_read = false
  ORDER BY created_at ASC
  LIMIT $2;
  ```

- If the unread list is usually shown newest-first, prefer `ORDER BY created_at DESC` so the index can be used consistently for UI feeds.

4. Likely computation cost

- Without index: cost can approach $O(n \log n)$ for filtering plus sorting over the candidate unread rows.
- With the composite index: the lookup is closer to $O(\log n + k)$ where $k$ is the number of unread rows returned.

5. Should we add indexes on every column?

- No. That is usually a bad tradeoff.
- Every index increases write cost, storage usage, and vacuum/maintenance overhead.
- The best strategy is to index columns that match real access patterns: `student_id`, `is_read`, `created_at`, and `notification_type`.

6. Query for students who got a placement notification in the last 7 days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

## Stage 4 — Fetch Performance & Caching Strategy

1. Problem

- Fetching notifications on every page load overloads the database and increases latency for students.

2. Recommended solution

- Use a combination of pagination, caching, and stale-while-revalidate behavior.

3. How to improve performance

- Paginate all notification feeds so the client fetches small batches.
- Cache the latest unread notifications and unread counts per student in Redis.
- Serve cached data immediately, then refresh it asynchronously after a short TTL.
- If traffic grows further, use read replicas for read-heavy endpoints.

4. Tradeoffs

- Pagination lowers DB pressure, but the UI must request more pages.
- Redis caching reduces latency, but adds invalidation complexity.
- Read replicas scale reads, but replicas may lag slightly behind writes.

5. Best practical choice for this exam

- Pagination + Redis cache for unread counts and the most recent notification page.

## Stage 5 — Reliable Bulk Notifications

1. Problems in the original pseudocode

- It performs email, DB write, and app push sequentially for each student.
- One email failure can interrupt the loop or leave the system in a partial state.
- It has no retry strategy, batching, or dead-letter handling.

2. Better design

- Split the workflow into jobs:
  - create notification records in batches
  - enqueue email jobs
  - enqueue in-app push jobs
  - process jobs with retry logic and dead-letter capture

3. Should saving to DB and sending email happen together?

- No, not in a single blocking transaction.
- The DB write should be durable first, then external side effects like email should be retried independently.
- This avoids holding DB locks while waiting on third-party email APIs.

4. Revised pseudocode

```text
function notify_all(student_ids, message):
    notification_batch = []

    for student_id in student_ids:
        notification_batch.push({ student_id, message, status: 'pending' })

    save_notifications_in_bulk(notification_batch)

    for student_id in student_ids:
        enqueue_job('send_email', { student_id, message })
        enqueue_job('push_in_app', { student_id, message })

worker process job:
    try:
        execute job
        mark job success
    catch error:
        retry with backoff
        if retries exhausted:
            send to dead-letter queue
```

5. How to handle 200 email failures mid-run

- Mark the failed jobs as retryable.
- Continue processing the rest of the queue.
- Re-run failed deliveries from the dead-letter queue after fixing the root cause.

## Stage 6 — Priority Inbox Approach

1. Priority rules

- Weight order: `Placement` > `Result` > `Event`.
- Recency should break ties so newer notifications appear first.

2. Implementation approach

- Fetch the notifications from the provided API.
- Convert each notification to a priority score.
- Keep only the top `n` notifications using a min-heap or bounded sorted list.

3. Efficient maintenance when new notifications keep arriving

- Maintain the current top `n` in memory for the session.
- On each new notification, compare its score with the lowest in the top list.
- If it is higher, replace the lowest and keep the list sorted.

4. Deliverable note

- The actual functioning code is implemented in the frontend codebase so the app can show the priority inbox and remain interactive.
