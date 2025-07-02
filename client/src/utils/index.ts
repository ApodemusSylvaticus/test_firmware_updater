import { DeviceInfo, emptyFormData, FormData } from '../interface/core.ts';

function typedEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

type FieldMapping = {
  [K in keyof DeviceInfo]?: keyof FormData;
};

const fieldMapping: FieldMapping = {
  name_device: 'deviceName',
  serial_number: 'serialNumber',
  data_manufacture: 'manufactureDate',
  firmware: 'Firmware',
  serial_core: 'coreSerialNumber',
  serial_lrf: 'lrfSerialNumber',
  click_x: 'clickX',
  click_y: 'clickY',
  vcom: 'vcom',
  uuid: 'uuid',
};

export function parseDeviceInfo(data: DeviceInfo | null) {
  if (!data) {
    console.log('Parsing failed or uuid.txt is missing.');
    return { ...emptyFormData };
  }

  const updatedFormData: FormData = { ...emptyFormData };

  for (const [deviceKey, deviceValue] of typedEntries(data)) {
    const formDataKey = fieldMapping[deviceKey];
    if (formDataKey && deviceValue !== undefined) {
      updatedFormData[formDataKey] = deviceValue;
    }
  }

  return updatedFormData;
}
