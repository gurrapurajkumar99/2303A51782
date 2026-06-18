import { useEffect, useMemo, useState } from 'react';
import { fetchNotifications } from '../api/notifications';
import { createLogger } from '../utils/logger';

const logger = createLogger('useNotifications');

export function useNotifications({ studentId = 1042, unreadOnly = false, page = 1, limit = 5, notificationType } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        logger.info('load:start', { studentId, unreadOnly, page, limit, notificationType });
        const data = await fetchNotifications({ studentId, unreadOnly, apiUrl: undefined });

        if (isMounted) {
          setNotifications(data.notifications);
          setTotalPages(data.totalPages);
          setTotal(data.total);
          logger.info('load:success', { studentId, count: data.notifications.length, total: data.total });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Failed to fetch notifications');
          logger.error('load:error', { studentId, message: loadError.message });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [studentId, unreadOnly, page, limit, notificationType]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  return { notifications, unreadCount, totalPages, total, loading, error };
}
