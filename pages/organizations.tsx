import React, { useState, useMemo } from 'react';
import { Grid, Container, Typography, Box } from '@mui/material';
import OrganizationCard from '../components/OrganizationCard';
import OrganizationControls from '../components/OrganizationControls';
import OrganizationReport from '../components/OrganizationReport';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// 샘플 주간 데이터
const generateWeeklyStats = () => {
  const stats = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    stats.push({
      date: date.toLocaleDateString(),
      completed: Math.floor(Math.random() * 20) + 5,
      active: Math.floor(Math.random() * 30) + 10,
      pending: Math.floor(Math.random() * 10)
    });
  }
  return stats;
};

// 샘플 데이터
const organizationsData = [
  {
    name: "진양노인통합지원센터",
    code: "A48170001",
    location: "진주시",
    monitoringStats: {
      activeCount: 25,
      completedToday: 12,
      pendingCount: 5,
      urgentCount: 2,
      lastUpdate: "2024-04-16 14:30",
      status: "normal" as const,
      contactPerson: "김담당",
      contactNumber: "010-1234-5678",
      weeklyStats: generateWeeklyStats()
    }
  },
  {
    name: "진주노인통합지원센터",
    code: "A48170002",
    location: "진주시",
    monitoringStats: {
      activeCount: 30,
      completedToday: 8,
      pendingCount: 10,
      urgentCount: 4,
      lastUpdate: "2024-04-16 14:25",
      status: "warning" as const,
      contactPerson: "이담당",
      contactNumber: "010-2345-6789",
      weeklyStats: generateWeeklyStats()
    }
  },
  {
    name: "나누리노인통합지원센터",
    code: "A48170003",
    location: "진주시",
    monitoringStats: {
      activeCount: 20,
      completedToday: 15,
      pendingCount: 2,
      urgentCount: 0,
      lastUpdate: "2024-04-16 14:20",
      status: "normal" as const,
      contactPerson: "박담당",
      contactNumber: "010-3456-7890",
      weeklyStats: generateWeeklyStats()
    }
  }
];

const OrganizationsPage = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lastUpdate');
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const filteredAndSortedOrgs = useMemo(() => {
    let filtered = organizationsData;
    
    // 상태 필터링
    if (statusFilter !== 'all') {
      filtered = filtered.filter(org => org.monitoringStats.status === statusFilter);
    }

    // 정렬
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'urgentCount':
          return b.monitoringStats.urgentCount - a.monitoringStats.urgentCount;
        case 'completionRate':
          const rateA = a.monitoringStats.completedToday / a.monitoringStats.activeCount;
          const rateB = b.monitoringStats.completedToday / b.monitoringStats.activeCount;
          return rateB - rateA;
        case 'activeCount':
          return b.monitoringStats.activeCount - a.monitoringStats.activeCount;
        case 'lastUpdate':
          return new Date(b.monitoringStats.lastUpdate).getTime() - 
                 new Date(a.monitoringStats.lastUpdate).getTime();
        default:
          return 0;
      }
    });
  }, [statusFilter, sortBy]);

  const selectedOrgData = useMemo(() => {
    return organizationsData.find(org => org.code === selectedOrg);
  }, [selectedOrg]);

  const handleExportCSV = () => {
    if (!selectedOrgData) return;

    const ws = XLSX.utils.json_to_sheet(selectedOrgData.monitoringStats.weeklyStats);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeeklyStats");
    XLSX.writeFile(wb, `${selectedOrgData.name}_주간보고서.xlsx`);
  };

  const handleExportPDF = () => {
    if (!selectedOrgData) return;

    const doc = new jsPDF();
    
    // 제목
    doc.setFontSize(16);
    doc.text(`${selectedOrgData.name} 주간 보고서`, 20, 20);
    
    // 기본 정보
    doc.setFontSize(12);
    doc.text(`기관 코드: ${selectedOrgData.code}`, 20, 40);
    doc.text(`위치: ${selectedOrgData.location}`, 20, 50);
    doc.text(`담당자: ${selectedOrgData.monitoringStats.contactPerson}`, 20, 60);
    
    // 통계 정보
    doc.text('주간 통계', 20, 80);
    selectedOrgData.monitoringStats.weeklyStats.forEach((stat, index) => {
      doc.text(
        `${stat.date}: 완료 ${stat.completed}건, 활성 ${stat.active}건, 대기 ${stat.pending}건`,
        20,
        100 + (index * 10)
      );
    });
    
    doc.save(`${selectedOrgData.name}_주간보고서.pdf`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          담당기관 모니터링 현황
        </Typography>
        <Typography color="textSecondary">
          각 기관의 실시간 모니터링 상태를 확인할 수 있습니다.
        </Typography>
      </Box>

      <OrganizationControls
        statusFilter={statusFilter}
        sortBy={sortBy}
        onStatusFilterChange={setStatusFilter}
        onSortChange={setSortBy}
      />

      <Grid container spacing={3}>
        {filteredAndSortedOrgs.map((org) => (
          <Grid item xs={12} sm={6} md={4} key={org.code}>
            <OrganizationCard
              name={org.name}
              code={org.code}
              location={org.location}
              monitoringStats={org.monitoringStats}
              onClick={() => setSelectedOrg(org.code)}
            />
          </Grid>
        ))}
      </Grid>

      {selectedOrgData && (
        <Box sx={{ mt: 4 }}>
          <OrganizationReport
            name={selectedOrgData.name}
            code={selectedOrgData.code}
            weeklyStats={selectedOrgData.monitoringStats.weeklyStats}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
          />
        </Box>
      )}
    </Container>
  );
};

export default OrganizationsPage; 