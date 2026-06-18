import { useState } from 'react';
import { Box, Container, Tab, Tabs, TextField, Typography } from '@mui/material';

import { NotificationsPage } from './pages/NotificationsPage';
import { PriorityInboxPage } from './pages/PriorityInboxPage';
import { createLogger } from './utils/logger';

import './App.css';

const logger = createLogger('App');

export default function App() {
  const [tab, setTab] = useState(0);
  const [studentIdInput, setStudentIdInput] = useState('1042');

  const parsedStudentId = Number.parseInt(studentIdInput, 10);
  const studentId = Number.isInteger(parsedStudentId) && parsedStudentId > 0 ? parsedStudentId : 1042;

  const handleTabChange = (_, newValue) => {
    logger.info('tab:change', { tab: newValue });
    setTab(newValue);
  };

  return (
    <Box className="app-shell">
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Box className="hero-panel">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2 }}>
                Campus Notification Platform
              </Typography>
              <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '2rem', md: '3.2rem' } }}>
                Notifications, prioritized.
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 760, mt: 1.5, color: 'rgba(15, 23, 42, 0.78)' }}>
                View the full notification feed, then jump to the priority inbox where Placement updates outrank
                Result and Event items while still respecting recency.
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
              <TextField
                label="Student ID"
                type="number"
                size="small"
                value={studentIdInput}
                onChange={(event) => setStudentIdInput(event.target.value)}
                onBlur={() => {
                  if (!studentIdInput || Number.parseInt(studentIdInput, 10) <= 0) {
                    setStudentIdInput('1042');
                  }
                }}
                inputProps={{ min: 1, step: 1 }}
                sx={{ maxWidth: 180, background: 'white', borderRadius: 2 }}
              />
            </Box>
          </Box>
        </Box>

        <Box className="tabs-panel">
          <Tabs value={tab} onChange={handleTabChange} variant="fullWidth" sx={{ mb: 3 }}>
            <Tab label="All Notifications" />
            <Tab label="Priority Inbox" />
          </Tabs>

          {tab === 0 ? <NotificationsPage studentId={studentId} /> : <PriorityInboxPage studentId={studentId} />}
        </Box>
      </Container>
    </Box>
  );
}