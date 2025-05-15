import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// 샘플 데이터
const monitoringData = [
  { date: '2024-04-01', normal: 130, warning: 15, error: 5 },
  { date: '2024-04-02', normal: 128, warning: 17, error: 5 },
  { date: '2024-04-03', normal: 125, warning: 20, error: 5 },
  { date: '2024-04-04', normal: 127, warning: 18, error: 5 },
  { date: '2024-04-05', normal: 132, warning: 13, error: 5 },
];

const staffPerformance = [
  {
    name: '김담당',
    resolved: 45,
    pending: 3,
    avgResponseTime: 12,
    satisfaction: 4.8,
  },
  {
    name: '이담당',
    resolved: 38,
    pending: 5,
    avgResponseTime: 15,
    satisfaction: 4.6,
  },
  {
    name: '박담당',
    resolved: 52,
    pending: 2,
    avgResponseTime: 10,
    satisfaction: 4.9,
  },
];

const reportTemplates = [
  {
    id: 1,
    name: '일일 모니터링 보고서',
    type: '일간',
    lastGenerated: '2024-04-15',
  },
  {
    id: 2,
    name: '주간 성과 분석',
    type: '주간',
    lastGenerated: '2024-04-14',
  },
  {
    id: 3,
    name: '월간 통계 보고서',
    type: '월간',
    lastGenerated: '2024-04-01',
  },
];

const StatisticsPage = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('resolved');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          통계 및 리포트
        </Typography>

        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 4 }}>
          <Tab label="모니터링 통계" />
          <Tab label="담당자 성과" />
          <Tab label="보고서 생성" />
        </Tabs>

        {/* 모니터링 통계 */}
        {selectedTab === 0 && (
          <>
            <Paper sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <DatePicker
                  label="시작일"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                />
                <DatePicker
                  label="종료일"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                />
                <Button variant="contained">조회</Button>
              </Box>

              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monitoringData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="normal" name="정상" stroke="#4caf50" />
                    <Line type="monotone" dataKey="warning" name="주의" stroke="#ff9800" />
                    <Line type="monotone" dataKey="error" name="위험" stroke="#f44336" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    평균 정상 상태
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    85%
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    평균 응답 시간
                  </Typography>
                  <Typography variant="h4" color="primary">
                    12분
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    문제 해결률
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    93%
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}

        {/* 담당자 성과 */}
        {selectedTab === 1 && (
          <>
            <Paper sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>담당자</InputLabel>
                  <Select
                    value={selectedStaff}
                    label="담당자"
                    onChange={(e) => setSelectedStaff(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    {staffPerformance.map((staff) => (
                      <MenuItem key={staff.name} value={staff.name}>
                        {staff.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>지표</InputLabel>
                  <Select
                    value={selectedMetric}
                    label="지표"
                    onChange={(e) => setSelectedMetric(e.target.value)}
                  >
                    <MenuItem value="resolved">처리 완료</MenuItem>
                    <MenuItem value="avgResponseTime">평균 응답 시간</MenuItem>
                    <MenuItem value="satisfaction">만족도</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>담당자</TableCell>
                      <TableCell align="right">처리 완료</TableCell>
                      <TableCell align="right">처리 중</TableCell>
                      <TableCell align="right">평균 응답 시간(분)</TableCell>
                      <TableCell align="right">만족도</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staffPerformance.map((staff) => (
                      <TableRow key={staff.name}>
                        <TableCell>{staff.name}</TableCell>
                        <TableCell align="right">{staff.resolved}</TableCell>
                        <TableCell align="right">{staff.pending}</TableCell>
                        <TableCell align="right">{staff.avgResponseTime}</TableCell>
                        <TableCell align="right">{staff.satisfaction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resolved" name="처리 완료" fill="#2196f3" />
                  <Bar dataKey="pending" name="처리 중" fill="#ff9800" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}

        {/* 보고서 생성 */}
        {selectedTab === 2 && (
          <>
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                새 보고서 생성
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="보고서 이름"
                    placeholder="보고서 이름을 입력하세요"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>보고서 유형</InputLabel>
                    <Select defaultValue="daily">
                      <MenuItem value="daily">일간</MenuItem>
                      <MenuItem value="weekly">주간</MenuItem>
                      <MenuItem value="monthly">월간</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button variant="contained" fullWidth>
                    보고서 생성
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                보고서 템플릿
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>보고서 이름</TableCell>
                      <TableCell>유형</TableCell>
                      <TableCell>최근 생성일</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>{template.name}</TableCell>
                        <TableCell>
                          <Chip label={template.type} size="small" />
                        </TableCell>
                        <TableCell>{template.lastGenerated}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton size="small">
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small">
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default StatisticsPage; 