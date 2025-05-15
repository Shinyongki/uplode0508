import React from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// 샘플 데이터
const overviewData = {
  totalOrgs: 150,
  activeOrgs: 142,
  totalStaff: 45,
  activeStaff: 42,
  unassignedOrgs: 3,
  pendingAlerts: 8,
  escalations: 2,
};

const workloadData = [
  { name: '김담당', count: 12 },
  { name: '이담당', count: 8 },
  { name: '박담당', count: 15 },
  { name: '최담당', count: 10 },
];

const statusDistribution = [
  { name: '정상', value: 120, color: '#4caf50' },
  { name: '주의', value: 25, color: '#ff9800' },
  { name: '위험', value: 5, color: '#f44336' },
];

const unassignedOrgs = [
  { name: '새롬노인복지센터', code: 'A48170010', location: '진주시' },
  { name: '행복노인복지센터', code: 'A48170011', location: '사천시' },
  { name: '미래노인복지센터', code: 'A48170012', location: '진주시' },
];

const recentAlerts = [
  {
    id: 1,
    org: '진양노인통합지원센터',
    type: '긴급',
    message: '시스템 장애 발생',
    time: '10분 전',
  },
  {
    id: 2,
    org: '나누리노인통합지원센터',
    type: '경고',
    message: '모니터링 응답 지연',
    time: '30분 전',
  },
];

const efficiencyData = [
  { name: '김담당', resolved: 45, pending: 3, efficiency: 93 },
  { name: '이담당', resolved: 38, pending: 5, efficiency: 88 },
  { name: '박담당', resolved: 52, pending: 2, efficiency: 96 },
  { name: '최담당', resolved: 41, pending: 4, efficiency: 91 },
];

const DashboardPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        대시보드
      </Typography>

      {/* 전체 현황 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {overviewData.totalOrgs}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              전체 기관
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {overviewData.totalStaff}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              전체 담당자
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {overviewData.unassignedOrgs}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              미배정 기관
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="error.main">
              {overviewData.pendingAlerts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              대기 중인 알림
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 담당자별 업무량 및 기관 상태 분포 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              담당자별 업무량 분포
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="담당 기관 수" fill="#2196f3" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              기관 상태 분포
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 미배정 기관 및 알림 현황 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              미배정 기관 목록
            </Typography>
            <List>
              {unassignedOrgs.map((org, index) => (
                <React.Fragment key={org.code}>
                  <ListItem>
                    <ListItemText
                      primary={org.name}
                      secondary={`${org.code} | ${org.location}`}
                    />
                  </ListItem>
                  {index < unassignedOrgs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              최근 알림
            </Typography>
            <List>
              {recentAlerts.map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={alert.type}
                            color={alert.type === '긴급' ? 'error' : 'warning'}
                            size="small"
                          />
                          {alert.org}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2">{alert.message}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {alert.time}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentAlerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* 담당자 효율성 분석 */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              담당자 업무 효율성
            </Typography>
            <Grid container spacing={2}>
              {efficiencyData.map((staff) => (
                <Grid item xs={12} md={6} key={staff.name}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1">{staff.name}</Typography>
                      <Typography variant="subtitle1" color="primary">
                        {staff.efficiency}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={staff.efficiency}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="success.main">
                        처리 완료: {staff.resolved}
                      </Typography>
                      <Typography variant="body2" color="warning.main">
                        처리 중: {staff.pending}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage; 