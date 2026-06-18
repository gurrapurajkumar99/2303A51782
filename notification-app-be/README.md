## Notification App Backend

Express-based backend used for the notification evaluation.

Run locally:

```bash
cd notification-app-be
npm install
npm start
```

Endpoints:

- `GET /health`
- `GET /api/notifications?studentId=1042`
- `POST /api/notifications`
- `POST /api/notifications/mark-read`

Logging:

- Uses the shared `logging-middleware` module for request and application logs.
