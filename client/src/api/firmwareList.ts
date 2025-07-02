import axios from 'axios';
import { FIRMWARE_LIST } from '@api/constant.ts';

export async function getFirmwareList(idToken: string) {
  try {
    const res = await axios.get(FIRMWARE_LIST, { headers: { 'Content-Type': 'application/json', Authorization: idToken } });
    console.log(res);
    return { error: null, data: res.data as string[] };
  } catch (error: any) {
    console.log('error', error);
    return { error: error?.response?.data?.error ?? 'Unknown error', data: null };
  }
}
