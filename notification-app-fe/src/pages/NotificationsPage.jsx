import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Box, CircularProgress, Divider, Pagination, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

import { NotificationCard } from '../components/NotificationCard';
import { NotificationFilter } from '../components/NotificationFilter';
import { useNotifications } from '../hooks/useNotifications';
import { createLogger } from '../utils/logger';

const logger = createLogger('NotificationsPage');
const PAGE_SIZE = 5;

export function NotificationsPage({ studentId = 1042 }) {
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);

  const { notifications, unreadCount, loading, error } = useNotifications({ studentId });

  useEffect(() => {
    logger.info('page:view', { studentId });
  }, [studentId]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'All') {
      return notifications;
    }

    return notifications.filter((notification) => (notification.type ?? notification.Type) === filter);
  }, [filter, notifications]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleNotifications = filteredNotifications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (newFilter) => {
    logger.info('filter:change', { studentId, filter: newFilter });
    setFilter(newFilter);
  };

  const handlePageChange = (_, newPage) => {
    logger.debug('page:change', { studentId, page: newPage });
    setPage(newPage);
  };

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Badge badgeContent={unreadCount} color="primary" max={99}>
            <NotificationsIcon sx={{ fontSize: 30 }} />
          </Badge>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              All Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Student {studentId} feed with type filtering and pagination.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 3 }}>
        <NotificationFilter value={filter} onChange={handleFilterChange} />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && <Alert severity="error">Failed to load notifications: {error}</Alert>}

      {!loading && !error && filteredNotifications.length === 0 && (
        <Alert severity="info">No notifications match the selected filter.</Alert>
      )}

      {!loading && !error && visibleNotifications.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {visibleNotifications.map((notification) => (
            <NotificationCard
              key={notification.id ?? notification.ID}
              notification={notification}
              highlight={!(notification.isRead ?? notification.read)}
            />
          ))}
        </Box>
      )}

      {!loading && !error && filteredNotifications.length > PAGE_SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
