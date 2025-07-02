import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import * as XLSX from 'xlsx';
import { SensorDataMap, useXlsTableData } from '@store/xlsTableData.ts';

export const IXSLUploader: React.FC = () => {
  const setData = useXlsTableData((state) => state.setData);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileRead = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('jsonData', jsonData);

      const transformedData: SensorDataMap = {};
      jsonData.forEach((entry: any) => {
        if (entry['Sensor ID'] && entry['Device ID']) {
          transformedData[entry['Sensor ID']] = {
            deviceName: entry['Device Name'],
            serialNumber: entry['Device ID'],
            manufactureDate: entry['Manufacture Date'],
            coreSerialNumber: entry['Sensor ID'],
            lrfSerialNumber: entry['LRF ID'],
            clickX: entry['Click X'],
            clickY: entry['Click Y'],
            vcom: entry['Vcom'],
            uuid: entry.UUID,
          };
        }
      });
      console.log('transformedData', transformedData);

      setData(transformedData);
      setIsSuccess(true);
    } catch (error) {
      console.error('Error processing XLS file:', error);
      setIsError(true);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsError(false);
    setIsSuccess(false);

    if (acceptedFiles.length !== 1 || (!acceptedFiles[0].name.endsWith('.xls') && !acceptedFiles[0].name.endsWith('.xlsx'))) {
      setIsError(true);
      return;
    }

    await handleFileRead(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
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
      <input {...getInputProps()} />
      {isError ? (
        <Typography color="error">Invalid file. Please select a valid .xls or .xlsx file.</Typography>
      ) : isSuccess ? (
        <Typography>File imported successfully!</Typography>
      ) : isDragActive ? (
        <Typography>Drop the file here to upload</Typography>
      ) : (
        <Typography>Drag and drop a .xls or .xlsx file here, or click to select</Typography>
      )}
    </Box>
  );
};
