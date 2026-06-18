const { randomUUID } = require('crypto');
const express = require('express');
const { createLogger } = require('../logging-middleware');

const logger = createLogger('notification-app-be');

const students = new Map([
  [1042, { id: 1042, rollNumber: 'ROLL1042', email: 'student1042@example.com' }],
]);

const notifications = [
  {
    id: randomUUID(),
    studentId: 1042,
    type: 'Placement',
    message: 'Interview shortlist released',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    studentId: 1042,
    type: 'Result',
    message: 'Mid-sem result published',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

function getStudentNotifications(studentId) {
  return notifications
    .filter((notification) => notification.studentId === studentId)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use((req, res, next) => {
  const startedAt = Date.now();
  logger.info('request:received', {
    method: req.method,
    path: req.path,
  });

  res.on('finish', () => {
    logger.info('request:finished', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, service: 'notification-app-be' });
});

app.get('/api/notifications', (req, res) => {
  const studentId = Number(req.query.studentId);
  const limit = Math.max(1, Number.parseInt(req.query.limit ?? '5', 10) || 5);
  const page = Math.max(1, Number.parseInt(req.query.page ?? '1', 10) || 1);
  const notificationType = req.query.notification_type;

  if (!studentId || !students.has(studentId)) {
    logger.warn('notifications:student-not-found', { studentId: Number.isFinite(studentId) ? studentId : null });
    return res.status(400).json({ message: 'Valid studentId query param is required' });
  }

  const unreadOnly = req.query.unreadOnly === 'true';
  const filtered = getStudentNotifications(studentId).filter((item) => {
    const matchesReadState = unreadOnly ? !item.isRead : true;
    const matchesType = notificationType ? item.type === notificationType : true;
    return matchesReadState && matchesType;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;
  const result = filtered.slice(startIndex, startIndex + limit);

  logger.info('notifications:fetched', {
    studentId,
    count: result.length,
    total,
    page: safePage,
    limit,
    notificationType: notificationType || 'all',
    unreadOnly,
  });

  return res.status(200).json({
    studentId,
    notifications: result,
    total,
    page: safePage,
    limit,
    totalPages,
  });
});

app.post('/api/notifications', (req, res) => {
  const studentId = Number(req.body.studentId);
  const type = req.body.type;
  const message = req.body.message;

  if (!studentId || !students.has(studentId) || !type || !message) {
    logger.warn('notifications:create-invalid-payload', { body: req.body });
    return res.status(400).json({ message: 'studentId, type and message are required' });
  }

  const notification = {
    id: randomUUID(),
    studentId,
    type,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  notifications.unshift(notification);

  logger.info('notifications:created', { studentId, type, notificationId: notification.id });
  return res.status(201).json({ id: notification.id, notification });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const studentId = Number(req.body.studentId);
  const ids = Array.isArray(req.body.notificationIds) ? req.body.notificationIds : [];

  if (!studentId || !students.has(studentId) || ids.length === 0) {
    logger.warn('notifications:mark-read-invalid-payload', { body: req.body });
    return res.status(400).json({ message: 'studentId and notificationIds are required' });
  }

  let updated = 0;
  for (const notification of notifications) {
    if (notification.studentId === studentId && ids.includes(notification.id) && !notification.isRead) {
      notification.isRead = true;
      updated += 1;
    }
  }

  logger.info('notifications:marked-read', { studentId, updated });
  return res.status(200).json({ updated });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  logger.error('request:failed', {
    method: req.method,
    path: req.path,
    error: error.message,
  });

  return res.status(500).json({ message: 'Internal server error' });
});

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  logger.info('server:started', { port });
  process.stdout.write(`notification-app-be listening on http://localhost:${port}\n`);
});
