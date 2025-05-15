import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { SelectChangeEvent } from '@mui/material/Select';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`master-tabpanel-${index}`}
      aria-labelledby={`master-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface Organization {
  id: string;
  name: string;
  code: string;
  location: string;
  type: string;
  assignedStaff: string;
  status: string;
  lastUpdated: string;
}

interface Staff {
  id: string;
  name: string;
  ID: string;
  이름: string;
  role: string;
  department: string;
  assignedOrgs: string[];
  status: string;
  contact: string;
}

const MasterPage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const [openMatchingDialog, setOpenMatchingDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [organizationsData, setOrganizationsData] = useState<Organization[]>([]);
  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 기관 데이터 가져오기
      const orgResponse = await axios.get('/api/organizations');
      setOrganizationsData(orgResponse.data as Organization[]);
      
      // 담당자 데이터 가져오기
      const staffResponse = await axios.get('/api/staff');
      setStaffData(staffResponse.data as Staff[]);
    } catch (err) {
      setError(err.message);
      console.error('데이터 로딩 중 오류 발생:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenMatchingDialog = () => {
    setSelectedOrg('');
    setSelectedStaff('');
    setOpenMatchingDialog(true);
  };

  const handleCloseMatchingDialog = () => {
    setOpenMatchingDialog(false);
    setSelectedOrg('');
    setSelectedStaff('');
  };

  const handleOrgChange = (event: SelectChangeEvent<string>) => {
    setSelectedOrg(event.target.value);
  };

  const handleStaffChange = (event: SelectChangeEvent<string>) => {
    setSelectedStaff(event.target.value);
  };

  const handleSaveMatching = async () => {
    if (!selectedOrg || !selectedStaff) {
      alert('기관과 담당자를 모두 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/matching', {
        organizationId: selectedOrg,
        staffId: selectedStaff
      });
      
      handleCloseMatchingDialog();
      // 데이터 새로고침
      fetchData();
    } catch (err) {
      setError('매칭 저장 중 오류가 발생했습니다.');
      console.error('매칭 저장 중 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          시스템 관리
        </Typography>
        <Typography color="textSecondary">
          기관 및 담당자 관리, 시스템 설정을 할 수 있습니다.
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="master management tabs"
        >
          <Tab label="기관 관리" />
          <Tab label="담당자 관리" />
          <Tab label="배정 관리" />
          <Tab label="시스템 설정" />
        </Tabs>
      </Paper>

      {/* 기관 관리 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
          >
            기관 등록
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
          >
            일괄 업로드
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>기관명</TableCell>
                <TableCell>코드</TableCell>
                <TableCell>위치</TableCell>
                <TableCell>분류</TableCell>
                <TableCell>담당자</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>최종 수정일</TableCell>
                <TableCell>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>로딩 중...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8}>{error}</TableCell>
                </TableRow>
              ) : organizationsData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>기관 없음</TableCell>
                </TableRow>
              ) : organizationsData.map(org => (
                <TableRow key={org.id || org.code}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{org.code}</TableCell>
                  <TableCell>{org.location}</TableCell>
                  <TableCell>
                    <Chip label={org.type} size="small" />
                  </TableCell>
                  <TableCell>{org.assignedStaff}</TableCell>
                  <TableCell>
                    <Chip
                      label={org.status === 'active' ? '활성' : '비활성'}
                      color={org.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{org.lastUpdated}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="수정">
                        <IconButton size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="담당자 배정">
                        <IconButton size="small">
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* 담당자 관리 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
          >
            담당자 등록
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>이름</TableCell>
                <TableCell>역할</TableCell>
                <TableCell>부서</TableCell>
                <TableCell>담당 기관 수</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>연락처</TableCell>
                <TableCell>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>로딩 중...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7}>{error}</TableCell>
                </TableRow>
              ) : staffData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>담당자 없음</TableCell>
                </TableRow>
              ) : staffData.map(staff => (
                <TableRow key={staff.id || staff.ID}>
                  <TableCell>{staff.name || staff.이름}</TableCell>
                  <TableCell>{staff.role}</TableCell>
                  <TableCell>{staff.department}</TableCell>
                  <TableCell>{staff.assignedOrgs}</TableCell>
                  <TableCell>
                    <Chip
                      label={staff.status === 'active' ? '근무중' : '휴직'}
                      color={staff.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{staff.contact}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="수정">
                        <IconButton size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* 배정 관리 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenMatchingDialog}
          >
            담당자 매칭 추가
          </Button>
        </Box>

        {/* 매칭 추가 모달 */}
        <Dialog
          open={openMatchingDialog}
          onClose={handleCloseMatchingDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>담당자 매칭 추가</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>기관 선택</InputLabel>
              <Select
                value={selectedOrg}
                onChange={handleOrgChange}
                label="기관 선택"
              >
                {organizationsData.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>담당자 선택</InputLabel>
              <Select
                value={selectedStaff}
                onChange={handleStaffChange}
                label="담당자 선택"
              >
                {staffData.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseMatchingDialog}>취소</Button>
            <Button onClick={handleSaveMatching} variant="contained" color="primary">
              저장
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            자동 배정 규칙
          </Typography>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>
                현재 설정: 업무량 기반 자동 배정 (최대 담당 기관 수: 5)
              </Typography>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
              >
                규칙 설정
              </Button>
            </Box>
          </Paper>
        </Box>

        <Typography variant="h6" gutterBottom>
          최근 배정 이력
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>날짜</TableCell>
                <TableCell>기관</TableCell>
                <TableCell>이전 담당자</TableCell>
                <TableCell>새 담당자</TableCell>
                <TableCell>사유</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* 배정 이력 데이터 */}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* 시스템 설정 탭 */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              알림 설정
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              모니터링 알림 규칙과 수신자를 설정합니다.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
            >
              설정 관리
            </Button>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              보고서 템플릿
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              보고서 양식과 자동 생성 규칙을 설정합니다.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
            >
              템플릿 관리
            </Button>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              모니터링 항목
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              모니터링할 항목과 체크리스트를 관리합니다.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
            >
              항목 관리
            </Button>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              에스컬레이션
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              문제 발생 시 자동 에스컬레이션 규칙을 설정합니다.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
            >
              규칙 관리
            </Button>
          </Paper>
        </Box>
      </TabPanel>
    </Container>
  );
};

export default MasterPage;