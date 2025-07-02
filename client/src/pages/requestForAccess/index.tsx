import React, { useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, IconButton, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { sendAccessRequest } from '@api/requestForAccess.ts';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const RequestForAccess: React.FC = React.memo(() => {
  const [email, setEmail] = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [responceMsg, setResponceMsg] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!executeRecaptcha) {
      setError('reCAPTCHA not ready');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await executeRecaptcha('requestForAccess');

      // Replace with actual API call
      const { message } = await sendAccessRequest(email, requestMsg, token);
      setResponceMsg(message);
    } catch (e) {
      console.error(e);
      setResponceMsg('An unexpected error occurred. Please try again later.');
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
          p: 3,
          borderRadius: 2,
          position: 'relative',
        }}
      >
        {/* Back Icon */}
        <IconButton sx={{ position: 'absolute', top: 8, right: 8 }} onClick={() => navigate('/login')}>
          <ArrowBackIcon />
        </IconButton>

        <CardContent sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {responceMsg && (
            <Typography variant="h6" align="center" gutterBottom>
              {responceMsg}
            </Typography>
          )}
          {!responceMsg && (
            <>
              <Typography variant="h6" align="center" gutterBottom>
                Request Access
              </Typography>

              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={email.length > 0 && !isValidEmail(email)}
                helperText={email.length > 0 && !isValidEmail(email) ? 'Invalid email address' : ''}
                fullWidth
                required
              />

              <TextField label="Message" multiline minRows={4} value={requestMsg} onChange={(e) => setRequestMsg(e.target.value)} fullWidth />

              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}

              <Button variant="contained" fullWidth disabled={!isValidEmail(email) || isLoading} onClick={handleSubmit}>
                {isLoading ? <CircularProgress size={24} /> : 'Submit'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
});
