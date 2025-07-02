import { create } from 'zustand';
import { emptyFormData, FormData, Nullable } from '../interface/core.ts';

interface UpdateFirmwareAndSettings {
  formData: FormData;
  setFormData: (newState: FormData) => void;
  deviceList: Nullable<Map<string, string[]>>;
  setDeviceList: (data: Map<string, string[]>) => void;
}

export const useUpdateFirmwareAndSettingsStore = create<UpdateFirmwareAndSettings>((set) => ({
  formData: emptyFormData,
  setFormData: (newState) => set({ formData: newState }),
  deviceList: null,
  setDeviceList: (deviceList) => set({ deviceList }),
}));
