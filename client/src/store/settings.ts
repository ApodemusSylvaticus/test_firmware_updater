import { create } from 'zustand';
import { Nullable } from '../interface/core.ts';

export interface Tokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

interface Settings {
  accessToken: Nullable<string>;
  idToken: Nullable<string>;
  refreshToken: Nullable<string>;
  setTokens: (data: Tokens) => void;
  clearTokens: () => void;
}

export const useSettingsStore = create<Settings>((set) => {
  const savedAccessToken = sessionStorage.getItem('accessToken') || null;
  const savedIdToken = sessionStorage.getItem('idToken') || null;
  const refreshToken = localStorage.getItem('refreshToken') || null;

  return {
    accessToken: savedAccessToken,
    idToken: savedIdToken,
    refreshToken,

    setTokens: ({ accessToken, refreshToken, idToken }) => {
      console.log('setTokens', { accessToken, refreshToken, idToken });

      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('idToken', idToken);
      localStorage.setItem('refreshToken', refreshToken);

      set({ accessToken, idToken, refreshToken });
    },

    clearTokens: () => {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');

      set({ accessToken: null, idToken: null, refreshToken: null });
    },
  };
});
