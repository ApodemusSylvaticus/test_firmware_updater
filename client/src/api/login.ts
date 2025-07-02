import axios from 'axios';
import { Nullable } from '@interface/core.ts';
import { START_AUTH_URL } from '@api/constant.ts';

export async function tryToLogin(email: string): Promise<{ isSuccess: boolean; error: Nullable<string> }> {
  try {
    const res = await axios.post(START_AUTH_URL, { email }, { headers: { 'Content-Type': 'application/json' } });

    console.log(res);
    return { error: null, isSuccess: res.status === 200 };
  } catch (error: any) {
    console.log('error', error);
    return { error: error?.response?.data?.error ?? 'Unknown error', isSuccess: false };
  }
}
