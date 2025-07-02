import React, { useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import { tryToLogin } from '@api/login.ts';
import { useNavigate } from 'react-router';

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const LoginPage: React.FC = React.memo(() => {
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setEmail(newValue);
    setError(null);

    if (newValue && !isValidEmail(newValue)) {
      setError('Invalid email format');
    }
  };

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setError('Invalid email format');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log('Logging in with email:', email);
      const { isSuccess, error: serverError } = await tryToLogin(email);
      console.log({ isSuccess, serverError });

      if (isSuccess) {
        setIsEmailSent(true);
      } else {
        setError(serverError || 'Failed to log in. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress size={48} />
            </Box>
          ) : isEmailSent ? (
            <Typography variant="h5" component="div" gutterBottom align="center" sx={{ fontWeight: 'semi-bold' }}>
              Check your email
            </Typography>
          ) : (
            <>
              <Typography variant="h5" component="div" gutterBottom align="center">
                Sign in
              </Typography>
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                margin="normal"
                value={email}
                onChange={handleEmailChange}
                error={!!error}
                helperText={error}
              />
              <Button onClick={handleSubmit} variant="contained" color="primary" fullWidth disabled={isLoading || !email || !!error}>
                {isLoading ? <CircularProgress size={24} /> : 'Log in'}
              </Button>
              <Button sx={{ marginTop: 1 }} onClick={() => navigate('/request')} variant="contained" color="primary" fullWidth>
                Request for access
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
});
