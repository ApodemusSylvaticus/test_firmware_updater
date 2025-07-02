import { Nullable } from '@interface/core.ts';
import axios from 'axios';

export async function getList(): Promise<{ isSuccess: boolean; error: Nullable<string> }> {
  try {
    const res = await axios.get('https://lcadb4pifj.execute-api.eu-central-1.amazonaws.com/authenticators/list?rpId=d14zzfdupwtdwi.cloudfront.net\n');

    console.log(res);
    return { error: null, isSuccess: res.status === 200 };
  } catch (error: any) {
    console.log('error', error);
    return { error: error?.response?.data?.error ?? 'Unknown error', isSuccess: false };
  }
}
