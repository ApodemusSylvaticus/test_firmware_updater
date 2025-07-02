import { create } from 'zustand';
import { Nullable, StableFormData } from '../interface/core.ts';

export type SensorData = Omit<StableFormData, 'Firmware' | 'autoGenMasterPas' | 'masterPas'>;

export type SensorDataMap = Record<string, SensorData>;

interface XlsTableData {
  data: SensorDataMap;
  setData: (newState: SensorDataMap) => void;
  removeSensor: (sensorId: string) => void;
  clearData: () => void;
  chosenRow: Nullable<SensorData>;
  chooseRow: (data: SensorData) => void;
}

export const useXlsTableData = create<XlsTableData>((set) => {
  const localStorageData = localStorage.getItem('sensorsData');
  const parsedData: SensorDataMap = localStorageData ? JSON.parse(localStorageData) : {};

  return {
    data: parsedData,

    setData: (newState) =>
      set(() => {
        localStorage.setItem('sensorsData', JSON.stringify(newState));

        return { data: newState };
      }),

    removeSensor: (sensorId) =>
      set((state) => {
        const newData = { ...state.data };
        delete newData[sensorId];
        localStorage.setItem('sensorsData', JSON.stringify(newData));

        return { data: newData };
      }),

    clearData: () =>
      set(() => {
        localStorage.removeItem('sensorsData');
        return { data: {} };
      }),

    chosenRow: null,

    chooseRow: (data) => set({ chosenRow: data }),
  };
});
