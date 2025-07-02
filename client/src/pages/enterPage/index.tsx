import React from 'react';
import { Link, useSearchParams } from 'react-router';
import { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '@store/settings.ts';
import { useNavigate } from 'react-router';
import { verifyToken } from '@api/verifyToken.ts';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { Nullable } from '@interface/core.ts';

export const EnterPage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Nullable<string>>(null);

  const token = searchParams.get('token');
  const navigate = useNavigate();

  const setTokens = useSettingsStore((state) => state.setTokens);

  const verifyUserToken = useCallback(async () => {
    if (token) {
      try {
        const { data, error: serverError } = await verifyToken(token);
        if (data) {
          setTokens(data);
          navigate('/app', { replace: true });
        } else if (serverError) {
          setError(serverError);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [navigate, setTokens, token]);

  useEffect(() => {
    verifyUserToken();
  }, [verifyUserToken]);

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
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh">
            {isLoading && (
              <>
                <Typography variant="h6" gutterBottom>
                  Verifying token
                </Typography>
                <CircularProgress sx={{ mt: 2 }} />
              </>
            )}

            {error && (
              <>
                <Typography
                  variant="body1"
                  align="center"
                  sx={{
                    fontSize: '1.125rem',
                    color: 'error.main',
                    padding: '1rem',
                    borderRadius: 1,
                    fontWeight: 'bold',
                    maxWidth: '80%',
                    margin: '0 auto',
                  }}
                >
                  Error: {error}
                </Typography>
                <Typography variant="body1" align="center" sx={{ mt: 2 }}>
                  <Link to="/login">Return to login page</Link>
                </Typography>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
});
