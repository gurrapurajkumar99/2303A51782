import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

import { NotificationCard } from '../components/NotificationCard';
import { NotificationFilter } from '../components/NotificationFilter';
import { usePriorityInbox } from '../hooks/usePriorityInbox';
import { createLogger } from '../utils/logger';

const logger = createLogger('PriorityInboxPage');
const topNOptions = [5, 10, 15, 20];

export function PriorityInboxPage() {
  const [filter, setFilter] = useState('All');
  const [topN, setTopN] = useState(10);
  const { notifications, loading, error } = usePriorityInbox({ limit: topN });

  useEffect(() => {
    logger.info('page:view', { topN });
  }, [topN]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'All') {
      return notifications;
    }

    return notifications.filter((notification) => (notification.type ?? notification.Type) === filter);
  }, [filter, notifications]);

  const handleFilterChange = (newFilter) => {
    logger.info('filter:change', { filter: newFilter });
    setFilter(newFilter);
  };

  const noticeSeverity = error?.toLowerCase().includes('not configured') ? 'warning' : error ? 'error' : 'info';

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Priority Inbox
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Placement notifications always win, then Result, then Event. Newer items win within the same type.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Top N
            </Typography>
            <Select size="small" value={topN} onChange={(event) => setTopN(Number(event.target.value))}>
              {topNOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  Top {option}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <NotificationFilter value={filter} onChange={handleFilterChange} />
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && <Alert severity={noticeSeverity}>{error}</Alert>}

      {!loading && filteredNotifications.length === 0 && !error && (
        <Alert severity="info">No priority notifications available from the live API for the current filter.</Alert>
      )}

      {!loading && filteredNotifications.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredNotifications.map((notification, index) => (
            <NotificationCard
              key={notification.id ?? notification.ID}
              notification={notification}
              highlight={index === 0}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
