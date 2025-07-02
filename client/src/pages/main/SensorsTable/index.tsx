import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Typography,
  Button,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import { SensorDataMap, useXlsTableData } from '@store/xlsTableData.ts';

export const SensorsTable: React.FC = () => {
  const [filteredData, setFilteredData] = useState<SensorDataMap>({});
  const [search, setSearch] = useState('');
  const [activeRow, setActiveRow] = useState<string | null>(null);

  const data = useXlsTableData((state) => state.data);
  const clearData = useXlsTableData((state) => state.clearData);
  const removeSensor = useXlsTableData((state) => state.removeSensor);
  const chooseRow = useXlsTableData((state) => state.chooseRow);

  // Active row border color variable
  const activeOutlineColor = 'rgba(25, 118, 210, 1)';

  useEffect(() => {
    if (search) {
      const dataArray = Object.entries(data).map(([key, value]) => ({
        ...value,
        sensorId: key,
      }));

      const fuse = new Fuse(dataArray, {
        keys: ['UUID', 'clickX', 'clickY', 'DeviceID', 'sensorId', 'LRFID', 'deviceName', 'manufactureDate', 'Vcom'],
        threshold: 0.3,
      });

      const results = fuse.search(search);
      const newFilteredData: SensorDataMap = {};
      results.forEach((result) => {
        if (result.item) {
          newFilteredData[result.item.sensorId] = result.item;
        }
      });

      setFilteredData(newFilteredData);
    } else {
      setFilteredData(data);
    }
  }, [search, data]);

  // Function to clear search input
  const handleClearSearch = () => {
    setSearch('');
    setFilteredData(data); // Reset filtered data
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', paddingTop: 2, overflow: 'auto' }}>
        <TextField
          label="Search"
          variant="outlined"
          fullWidth
          sx={{ mb: 2 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClearSearch}
                  edge="end"
                  size="small"
                  onMouseDown={(e) => e.preventDefault()} // Убирает фокус после клика
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
            <Table stickyHeader sx={{ borderSpacing: 0 }}>
              <TableHead
                sx={{
                  '& .MuiTableCell-root': {
                    backgroundColor: '#161B22',
                    zIndex: 1,
                  },
                }}
              >
                <TableRow>
                  <TableCell>
                    <strong>Device Name</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Date</strong>
                  </TableCell>
                  <TableCell>
                    <strong>X</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Y</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Vcom</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Sensor ID</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Device ID</strong>
                  </TableCell>
                  <TableCell>
                    <strong>LRF ID</strong>
                  </TableCell>
                  <TableCell>
                    <strong>UUID</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Action</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.keys(filteredData).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography color="textSecondary">No data</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.keys(filteredData).map((sensorId) => (
                    <TableRow
                      key={sensorId}
                      hover={activeRow !== sensorId}
                      onClick={() => {
                        chooseRow(filteredData[sensorId]);
                        setActiveRow(sensorId);
                      }}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 100ms ease-in-out, outline 100ms ease-in-out',
                        outline: activeRow === sensorId ? `2px solid ${activeOutlineColor}` : 'none',
                        outlineOffset: '-2px',
                        '&:hover': activeRow !== sensorId ? { backgroundColor: 'rgba(25, 118, 210, 0.1)' } : {},
                      }}
                    >
                      <TableCell>{filteredData[sensorId].deviceName}</TableCell>
                      <TableCell>{filteredData[sensorId].manufactureDate}</TableCell>
                      <TableCell>{filteredData[sensorId].clickX}</TableCell>
                      <TableCell>{filteredData[sensorId].clickY}</TableCell>
                      <TableCell>{filteredData[sensorId].vcom}</TableCell>
                      <TableCell>{sensorId}</TableCell>
                      <TableCell>{filteredData[sensorId].serialNumber}</TableCell>
                      <TableCell>{filteredData[sensorId].lrfSerialNumber}</TableCell>
                      <TableCell>{filteredData[sensorId].uuid}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSensor(sensorId);
                          }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
      <Button
        variant="contained"
        color="error"
        sx={{
          mt: 2,
          background: '#a11a1a',
          '&:hover': {
            backgroundColor: '#9a0007',
          },
        }}
        onClick={clearData}
        fullWidth
      >
        Clear Data
      </Button>
    </>
  );
};
