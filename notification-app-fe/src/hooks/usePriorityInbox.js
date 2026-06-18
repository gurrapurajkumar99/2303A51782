import { useEffect, useMemo, useState } from 'react';
import { fetchPriorityNotifications } from '../api/notifications';
import { createLogger } from '../utils/logger';
import { getTopPriorityNotifications } from '../utils/priorityInbox';

const logger = createLogger('usePriorityInbox');

export function usePriorityInbox({ limit = 10 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      const apiToken = import.meta.env.VITE_PRIORITY_API_TOKEN || '';

      if (!apiToken) {
        if (isMounted) {
          setNotifications([]);
          setError('Priority API token not configured. Live API data is unavailable.');
          setLoading(false);
        }

        return;
      }

      try {
        logger.info('load:start', { limit });
        const data = await fetchPriorityNotifications({ token: apiToken });

        if (isMounted) {
          setNotifications(data);
          logger.info('load:success', { count: data.length });
        }
      } catch (loadError) {
        if (isMounted) {
          setNotifications([]);
          setError(loadError.message || 'Priority API unavailable.');
          logger.warn('load:fallback', { message: loadError.message });
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
  }, [limit]);

  const topNotifications = useMemo(
    () => getTopPriorityNotifications(notifications, limit),
    [notifications, limit],
  );

  return { notifications: topNotifications, loading, error };
}
