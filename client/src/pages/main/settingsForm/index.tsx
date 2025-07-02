import React from 'react';
import { Box, Checkbox, FormControlLabel, TextField } from '@mui/material';
import { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { StableFormData } from '@interface/core.ts';

interface ISettingsForm {
  register: UseFormRegister<StableFormData>;
  watch: UseFormWatch<StableFormData>;
  errors: FieldErrors<StableFormData>;
}

export const SettingsForm: React.FC<ISettingsForm> = ({ register, watch, errors }) => {
  const fields = [
    { name: 'deviceName', label: 'Device Name' },
    { name: 'serialNumber', label: 'Serial Number' },
    { name: 'manufactureDate', label: 'Manufacture Date' },
    { name: 'coreSerialNumber', label: 'Core Serial Number' },
    { name: 'lrfSerialNumber', label: 'LRF Serial Number' },
    { name: 'clickX', label: 'Click X', type: 'number' },
    { name: 'clickY', label: 'Click Y', type: 'number' },
    { name: 'vcom', label: 'VCom', type: 'number' },
  ];

  return (
    <>
      {fields.map(({ name, label, type }) => (
        <TextField
          key={name}
          size="small"
          label={label}
          variant="outlined"
          fullWidth
          type={type}
          {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
          InputLabelProps={{ shrink: !!watch(name) }}
        />
      ))}
      <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%' }}>
        <TextField
          size="small"
          label="MasterPas"
          variant="outlined"
          type="number"
          {...register('masterPas', { valueAsNumber: true })}
          disabled={watch('autoGenMasterPas')}
          sx={{ flexGrow: 1 }}
          InputLabelProps={{ shrink: !!watch('masterPas') }}
        />
        <FormControlLabel label="Auto-generate" control={<Checkbox {...register('autoGenMasterPas')} />} />
      </Box>
      <TextField
        label="UUID"
        variant="outlined"
        size="small"
        fullWidth
        {...register('uuid', { required: 'UUID is required' })}
        error={!!errors.uuid}
        helperText={errors.uuid?.message}
        InputLabelProps={{ shrink: !!watch('uuid') }}
      />
    </>
  );
};
