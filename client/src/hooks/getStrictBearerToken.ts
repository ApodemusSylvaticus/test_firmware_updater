import { useSettingsStore } from '../store/settings.ts';

export const useGetStrictIdToken = () => {
  const idToken = useSettingsStore((state) => state.idToken);
  if (idToken === null) {
    throw new Error('idToken is null');
  }
  return idToken;
};

export const useGetStrictAccessToken = () => {
  const accessToken = useSettingsStore((state) => state.accessToken);
  if (accessToken === null) {
    throw new Error('accessToken is null');
  }
  return accessToken;
};
