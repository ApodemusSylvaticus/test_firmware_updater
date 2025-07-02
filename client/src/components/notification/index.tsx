import React from 'react';
import { Alert, Slide, Stack } from '@mui/material';
import { useNotificationStore } from '@store/notification.ts';

export const NotificationList = React.memo(() => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <Stack spacing={1.5} position="fixed" bottom={20} left={20} sx={{ zIndex: 1300 }}>
      {notifications.map((notification) => (
        <Slide key={notification.id} direction="right" in={notification.visible} mountOnEnter unmountOnExit>
          <Alert onClose={() => removeNotification(notification.id)} severity={notification.type} sx={{ minWidth: 300, boxShadow: 3 }}>
            {notification.message}
          </Alert>
        </Slide>
      ))}
    </Stack>
  );
});
