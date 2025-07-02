import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import tomlParser from 'toml';
import { DeviceInfo, emptyFormData } from '@interface/core.ts';
import { useUpdateFirmwareAndSettingsStore } from '@store/updateFirmwareAndSettings.ts';
import { parseDeviceInfo } from '@/utils';
import { useGetStrictIdToken } from '@/hooks/getStrictBearerToken.ts';

/**
 * Extending the standard File interface
 * to include webkitRelativePath without using "any".
 */
interface ExtendedFile extends File {
  webkitRelativePath: string;
}

export const DeviceInfoDirectory: React.FC = () => {
  const idToken = useGetStrictIdToken();
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const setFirmwareAndSettings = useUpdateFirmwareAndSettingsStore((state) => state.setFormData);
  const sendDataToLogAPI = useCallback(
    async (data: DeviceInfo): Promise<void> => {
      try {
        const modifiedData = {
          ...data,
          type: 'info drop',
        };

        const response = await fetch('https://aelrii29fl.execute-api.eu-central-1.amazonaws.com/firmware-updater-action-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(modifiedData),
        });

        if (!response.ok) {
          throw new Error(`Failed to send data to API. Status: ${response.status}`);
        }

        console.log('Data sent to API successfully');
      } catch (error) {
        console.error('API Error:', error);
      }
    },
    [idToken],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]): Promise<void> => {
      setIsError(false);
      setIsSuccess(false);

      let infoContent = '';
      let uuidContent = '';
      let filePresent = false;

      for (const file of acceptedFiles) {
        // Cast File to our extended interface
        const extendedFile = file as ExtendedFile;
        const filePath = extendedFile.webkitRelativePath || extendedFile.name;

        if (filePath.endsWith('info.txt')) {
          infoContent = await extendedFile.text();
          filePresent = true;
        } else if (filePath.endsWith('uuid.txt')) {
          uuidContent = await extendedFile.text();
          filePresent = true;
        }
      }

      if (!filePresent) {
        console.warn('info.txt or uuid.txt files not found.');
        setFirmwareAndSettings(emptyFormData);
        setIsError(true);
        return;
      }

      // Start with an object where uuid is an empty string
      const parsedData: DeviceInfo = { uuid: '' };

      try {
        // Parse info.txt as TOML and cast to Partial<DeviceInfo>
        if (infoContent) {
          const infoObj = tomlParser.parse(infoContent) as Partial<DeviceInfo>;
          Object.assign(parsedData, infoObj);
        }

        // Read uuid.txt content
        if (uuidContent.trim()) {
          parsedData.uuid = uuidContent.trim();
        }

        // Return parsed result to parent component
        const res = parseDeviceInfo(parsedData);
        setFirmwareAndSettings(res);

        // Send data to the server
        await sendDataToLogAPI(parsedData);

        setIsSuccess(true);
      } catch (error) {
        console.error('Error parsing files:', error);
        setFirmwareAndSettings(emptyFormData);
        setIsError(true);
      }
    },
    [sendDataToLogAPI, setFirmwareAndSettings],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed grey',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        borderRadius: '4px',
      }}
    >
      {/*
        If you want to allow only directory selection,
        add the attributes directory="", webkitdirectory=""
        (note: TypeScript does not recognize them without extending types).
      */}
      {/* @ts-expect-error - To avoid TS error on webkitdirectory */}
      <input {...getInputProps({ webkitdirectory: 'true' })} />

      {isError ? (
        <Typography color="error">Invalid data (failed to read info.txt or uuid.txt)</Typography>
      ) : isSuccess ? (
        <Typography>Info imported successfully!</Typography>
      ) : isDragActive ? (
        <Typography>Drop the files to upload</Typography>
      ) : (
        <Typography>Drag a directory here or click to select</Typography>
      )}
    </Box>
  );
};
