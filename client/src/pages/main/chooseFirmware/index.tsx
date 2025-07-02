import * as React from 'react';
import { ListSubheader, MenuItem, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { Controller, Control } from 'react-hook-form';
import { Nullable, StableFormData } from '@interface/core.ts';
import { useUpdateFirmwareAndSettingsStore } from '@store/updateFirmwareAndSettings.ts';

interface IChooseFirmware {
  control: Control<StableFormData>;
  isLoading: boolean;
  error: Nullable<string>;
}

export const ChooseFirmware: React.FC<IChooseFirmware> = ({ control, isLoading, error }) => {
  const deviceList = useUpdateFirmwareAndSettingsStore((state) => state.deviceList);

  if (error) {
    return (
      <Typography color="error" variant="body2">
        Failed to load the firmware list: {error}
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" width="100%" py={2} gap={2}>
        <CircularProgress size={32} />
        <Typography>Loading firmware list...</Typography>
      </Box>
    );
  }

  if (deviceList === null) {
    return (
      <Typography color="error" variant="body2">
        Failed to load the firmware list
      </Typography>
    );
  }

  if (deviceList.size === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No firmware available
      </Typography>
    );
  }

  return (
    <Controller
      name="Firmware"
      control={control}
      rules={{ required: 'Please select a firmware version' }}
      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
        <TextField
          size="small"
          select
          label="Firmware"
          variant="outlined"
          fullWidth
          inputRef={ref}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          error={!!error}
          helperText={error?.message}
          disabled={isLoading}
        >
          {[...deviceList.entries()].map(([group, versions]) => [
            <ListSubheader key={`${group}-header`}>{group}</ListSubheader>,
            versions.map((ver) => (
              <MenuItem key={`${group}::${ver}`} value={`${group}::${ver}`}>
                {ver}
              </MenuItem>
            )),
          ])}
        </TextField>
      )}
    />
  );
};
