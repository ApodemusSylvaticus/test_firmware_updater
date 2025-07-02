import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useSettingsStore } from '@store/settings.ts';
import { refreshAuthTokens } from '@api/refresh.ts';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';

export const ProtectedAppRoute: React.FC<PropsWithChildren> = ({ children }) => {
  const accessToken = useSettingsStore((props) => props.accessToken);
  const refreshToken = useSettingsStore((props) => props.refreshToken);
  const setTokens = useSettingsStore((props) => props.setTokens);
  const clearTokens = useSettingsStore((props) => props.clearTokens);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuth = async () => {
      if (accessToken) {
        setLoading(false);
        return;
      }

      if (refreshToken) {
        try {
          const newTokens = await refreshAuthTokens(refreshToken);
          if (newTokens) {
            setTokens(newTokens);
          } else {
            clearTokens();
          }
        } catch {
          clearTokens();
        }
      }

      setLoading(false);
    };

    handleAuth();
  }, [accessToken, refreshToken, setTokens, clearTokens]);

  if (loading)
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 400,
            minWidth: 280,
            height: 300,
            p: 2,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CardContent sx={{ width: '100%' }}>
            <Box display="flex" flexDirection={'column'} justifyContent="center" alignItems="center" height="100%">
              <Typography variant="h6" gutterBottom>
                Verifying token
              </Typography>
              <CircularProgress sx={{ mt: 2 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>
    );

  if (!accessToken) return <Navigate to="/login" replace />;

  return <>{children}</>;
};
