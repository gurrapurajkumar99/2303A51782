import { Box, Card, CardContent, Chip, Typography } from '@mui/material';

const chipColorMap = {
  Placement: 'success',
  Result: 'primary',
  Event: 'warning',
};

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
}

export function NotificationCard({ notification, highlight = false }) {
  const type = notification.type ?? notification.Type ?? 'Event';
  const message = notification.message ?? notification.Message ?? '';
  const createdAt = notification.createdAt ?? notification.Timestamp ?? notification.timestamp;
  const isRead = notification.isRead ?? notification.read ?? false;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: highlight ? 'primary.main' : 'divider',
        boxShadow: highlight ? '0 8px 28px rgba(15, 23, 42, 0.12)' : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label={type} color={chipColorMap[type] || 'default'} size="small" />
              <Chip
                label={isRead ? 'Read' : 'Unread'}
                color={isRead ? 'default' : 'secondary'}
                variant={isRead ? 'outlined' : 'filled'}
                size="small"
              />
            </Box>

            <Typography variant="subtitle1" fontWeight={700}>
              {message}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {formatTimestamp(createdAt)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
