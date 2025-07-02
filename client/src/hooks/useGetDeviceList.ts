import { useUpdateFirmwareAndSettingsStore } from '@store/updateFirmwareAndSettings.ts';
import { useEffect, useState } from 'react';
import { getFirmwareList } from '@api/firmwareList.ts';
import { organizeBucketListItems } from '@utils/organizeBucketListItems.ts';
import { useSettingsStore } from '@store/settings.ts';
import { Nullable } from '@interface/core.ts';

export const useGetDeviceList = () => {
  const setDeviceList = useUpdateFirmwareAndSettingsStore((state) => state.setDeviceList);
  const idToken = useSettingsStore((state) => state.idToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Nullable<string>>(null);

  useEffect(() => {
    if (idToken) {
      setIsLoading(true);
      getFirmwareList(idToken)
        .then((e) => {
          if (e.data) {
            const devList = organizeBucketListItems(e.data);
            setDeviceList(devList);
          } else {
            setError(e.error);
          }
        })
        .catch((e) => setError(e))
        .finally(() => setIsLoading(false));
    }
  }, [idToken, setDeviceList]);
  return { isDeviseListLoading: isLoading, deviceListError: error };
};
