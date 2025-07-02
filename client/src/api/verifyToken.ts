import axios from 'axios';
import { Nullable } from '../interface/core.ts';
import { Tokens } from '../store/settings.ts';
import { START_VERIFY_URL } from '@api/constant.ts';

interface verifyTokenResponse {
  data: Nullable<Tokens>;
  error: Nullable<string>;
}

export async function verifyToken(token: string): Promise<verifyTokenResponse> {
  try {
    const res = await axios.post(START_VERIFY_URL, { token }, { headers: { 'Content-Type': 'application/json' } });
    console.log('res', res);
    if (res.status === 200) {
      return { error: null, data: { idToken: res.data.IdToken, accessToken: res.data.AccessToken, refreshToken: res.data.RefreshToken } };
    }
    return { error: 'Verify failed', data: null };
  } catch (err: any) {
    const error = err?.response?.data?.error ?? 'Verify failed';
    const details = err?.response?.data?.details ?? '';
    return { error: `${error} ${details}`, data: null };
  }
}
