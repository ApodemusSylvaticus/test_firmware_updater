import axios from 'axios';
import { Tokens } from '../store/settings.ts';
import { Nullable } from '../interface/core.ts';
import { REFRESH_TOKEN_URL } from '@api/constant.ts';

export async function refreshAuthTokens(refreshToken: string): Promise<Nullable<Tokens>> {
  const API_URL = `${REFRESH_TOKEN_URL}?token=${refreshToken}`;
  try {
    const response = await axios.get(API_URL, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('New tokens:', response);
    return response.data as Tokens;
  } catch (error) {
    console.error('Error refreshing tokens:', error.response?.data || error.message);
    return null;
  }
}
