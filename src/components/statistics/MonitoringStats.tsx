import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { Grid } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// 임시 데이터
const data = [
  { name: '1월', 정상: 400, 이상: 24 },
  { name: '2월', 정상: 300, 이상: 13 },
  { name: '3월', 정상: 200, 이상: 38 },
  { name: '4월', 정상: 278, 이상: 39 },
  { name: '5월', 정상: 189, 이상: 48 },
  { name: '6월', 정상: 239, 이상: 38 },
];

export default function MonitoringStats() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        모니터링 통계
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              월별 모니터링 현황
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="정상"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
                <Line type="monotone" dataKey="이상" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              금일 모니터링 요약
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle1">전체 모니터링</Typography>
                <Typography variant="h4">152</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1">이상 감지</Typography>
                <Typography variant="h4">12</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              이번 달 통계
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle1">평균 모니터링/일</Typography>
                <Typography variant="h4">145</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1">평균 이상 감지/일</Typography>
                <Typography variant="h4">8</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 