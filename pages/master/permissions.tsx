import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Checkbox,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// 샘플 데이터
const roleGroups = [
  {
    id: 1,
    name: '시스템 관리자',
    description: '모든 기능에 대한 접근 권한',
    members: 3,
    status: 'active',
  },
  {
    id: 2,
    name: '기관 관리자',
    description: '기관 관리 및 모니터링 권한',
    members: 8,
    status: 'active',
  },
  {
    id: 3,
    name: '일반 담당자',
    description: '배정된 기관 모니터링 권한',
    members: 34,
    status: 'active',
  },
];

const menuPermissions = [
  {
    id: 1,
    category: '대시보드',
    items: [
      { id: 'dashboard_view', name: '대시보드 조회', description: '대시보드 통계 조회' },
      { id: 'dashboard_export', name: '통계 내보내기', description: '대시보드 데이터 내보내기' },
    ],
  },
  {
    id: 2,
    category: '기관 관리',
    items: [
      { id: 'org_view', name: '기관 조회', description: '기관 정보 조회' },
      { id: 'org_create', name: '기관 등록', description: '새로운 기관 등록' },
      { id: 'org_edit', name: '기관 수정', description: '기관 정보 수정' },
      { id: 'org_delete', name: '기관 삭제', description: '기관 정보 삭제' },
    ],
  },
  {
    id: 3,
    category: '담당자 관리',
    items: [
      { id: 'staff_view', name: '담당자 조회', description: '담당자 정보 조회' },
      { id: 'staff_create', name: '담당자 등록', description: '새로운 담당자 등록' },
      { id: 'staff_edit', name: '담당자 수정', description: '담당자 정보 수정' },
      { id: 'staff_delete', name: '담당자 삭제', description: '담당자 정보 삭제' },
    ],
  },
];

const PermissionsPage = () => {
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handleOpenRoleDialog = (role?: any) => {
    setSelectedRole(role || null);
    setOpenRoleDialog(true);
  };

  const handleCloseRoleDialog = () => {
    setSelectedRole(null);
    setOpenRoleDialog(false);
  };

  const handlePermissionChange = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        권한 관리
      </Typography>

      {/* 권한 그룹 관리 */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">권한 그룹</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenRoleDialog()}
          >
            그룹 추가
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>그룹명</TableCell>
                <TableCell>설명</TableCell>
                <TableCell>소속 인원</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roleGroups.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>{role.members}명</TableCell>
                  <TableCell>
                    <Chip
                      label={role.status === 'active' ? '활성' : '비활성'}
                      color={role.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenRoleDialog(role)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 메뉴별 권한 설정 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          메뉴별 권한 설정
        </Typography>

        {menuPermissions.map((category) => (
          <Box key={category.id} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {category.category}
            </Typography>
            <Grid container spacing={2}>
              {category.items.map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item.id}>
                  <Paper
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      height: '100%',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedPermissions.includes(item.id)}
                          onChange={() => handlePermissionChange(item.id)}
                        />
                      }
                      label={item.name}
                    />
                    <Typography variant="body2" color="textSecondary">
                      {item.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="contained" color="primary">
            권한 설정 저장
          </Button>
        </Box>
      </Paper>

      {/* 권한 그룹 추가/수정 다이얼로그 */}
      <Dialog open={openRoleDialog} onClose={handleCloseRoleDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedRole ? '권한 그룹 수정' : '권한 그룹 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="그룹명"
              defaultValue={selectedRole?.name}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={2}
              defaultValue={selectedRole?.description}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  defaultChecked={selectedRole?.status === 'active'}
                />
              }
              label="활성화"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>취소</Button>
          <Button variant="contained" color="primary">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PermissionsPage; 