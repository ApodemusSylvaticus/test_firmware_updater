import axios from 'axios';
import { REQUEST_FOR_ACCESS } from '@api/constant.ts';

interface RequestAccessResponse {
  message: string;
}

export const sendAccessRequest = async (email: string, additionalInfo: string, recaptchaToken: string): Promise<RequestAccessResponse> => {
  try {
    const response = await axios.post<RequestAccessResponse>(
      REQUEST_FOR_ACCESS,
      {
        email,
        additionalInfo,
        recaptchaToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error: any) {
    console.log('response error', error);

    if (axios.isAxiosError(error) && error.response) {
      return {
        message: error.response.data?.message || 'An unexpected error occurred. Please try again later.',
      };
    }

    return {
      message: 'Failed to connect to server. Please check your network.',
    };
  }
};
