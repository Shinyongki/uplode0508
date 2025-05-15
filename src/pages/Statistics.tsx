import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography, Paper } from '@mui/material';
import MonitoringStats from '../components/statistics/MonitoringStats';
import PersonalPerformance from '../components/statistics/PersonalPerformance';
import ReportGeneration from '../components/statistics/ReportGeneration';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`statistics-tabpanel-${index}`}
      aria-labelledby={`statistics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `statistics-tab-${index}`,
    'aria-controls': `statistics-tabpanel-${index}`,
  };
}

export default function Statistics() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Statistics & Reports
      </Typography>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="statistics tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Monitoring Statistics" {...a11yProps(0)} />
          <Tab label="Performance by Person" {...a11yProps(1)} />
          <Tab label="Report Generation" {...a11yProps(2)} />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <MonitoringStats />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <PersonalPerformance />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <ReportGeneration />
      </TabPanel>
    </Box>
  );
} 