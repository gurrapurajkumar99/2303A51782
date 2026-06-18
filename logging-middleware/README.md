## Logging Middleware

This module provides a lightweight structured logging utility and an Express-compatible HTTP middleware.

Features:

- `createLogger(name)` returns `{info,warn,error,debug}` methods
- `expressMiddleware(logger)` logs incoming requests and response times
- Designed to be imported by backend and frontend code; application code must call this logger instead of `console.log`.

Usage (backend):

```js
const { createLogger, expressMiddleware } = require("./logging-middleware");
const logger = createLogger("notifications-service");
app.use(express.json());
app.use(expressMiddleware(logger));

// inside route
logger.info("received request", { route: "/api/notifications" });
```

Usage (frontend):

```js
import { createLogger } from "../logging-middleware";
const logger = createLogger("notifications-fe");
logger.info("notifications page opened", { studentId });
```

Logs are appended to `logging-middleware/logs/app.log` by default.
