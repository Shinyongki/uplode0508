const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const { getOrganizations, getCommittees } = require('../services/sheetService');

// 홈페이지
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// 로그인 페이지
router.get('/login', (req, res) => {
  // 이미 로그인된 경우 대시보드로 리다이렉트
  if (req.session.committee) {
    return res.redirect('/dashboard');
  }
  
  // 세션에서 에러 메시지 가져오기
  const errorMessage = req.session.errorMessage || '';
  // 사용 후 세션에서 메시지 삭제
  delete req.session.errorMessage;
  
  res.render('login', {
    title: '로그인 - 노인맞춤돌봄서비스 모니터링',
    message: errorMessage
  });
});

// 대시보드 (로그인 필요)
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.redirect('/');
});

// 관리자 페이지 (로그인 필요)
router.get('/admin', ensureAuthenticated, (req, res) => {
  res.redirect('/');
});

// 일정 관리 페이지 (로그인 필요)
router.get('/calendar', ensureAuthenticated, (req, res) => {
  res.sendFile('calendar.html', { root: './public' });
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// 위원 목록 가져오기 API
router.get('/api/committees/sheet', ensureAuthenticated, async (req, res) => {
  try {
    const committees = await getCommittees();
    res.json({
      status: 'success',
      data: { committees }
    });
  } catch (error) {
    console.error('위원 목록 가져오기 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '위원 목록을 가져오는데 실패했습니다.'
    });
  }
});

// 기관 목록 가져오기 API
router.get('/api/organizations/sheet', ensureAuthenticated, async (req, res) => {
  try {
    const organizations = await getOrganizations();
    res.json({
      status: 'success',
      data: { organizations }
    });
  } catch (error) {
    console.error('기관 목록 가져오기 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '기관 목록을 가져오는데 실패했습니다.'
    });
  }
});

module.exports = router; 