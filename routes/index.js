const express = require('express');
const path = require('path');
const router = express.Router();

// 기본 라우트 - SPA를 위한 정적 파일 제공
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 인증 확인 미들웨어
const isAuthenticated = (req, res, next) => {
  // 개발 환경인지 확인
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // 세션에 위원 정보가 있으면 인증 성공
  if (req.session && req.session.committee) {
    return next();
  }
  
  // 개발 환경에서는 프리뷰를 위해 인증 검사 완화
  if (isDevelopment && req.path === '/calendar') {
    console.log('개발 환경에서 일정관리 페이지 인증 검사 완화');
    return next();
  }
  
  // API 요청인 경우 JSON 응답
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
    return res.status(401).json({
      status: 'error',
      message: '인증이 필요합니다.'
    });
  }
  
  // 일반 요청인 경우 로그인 페이지로 리디렉션
  res.redirect('/login');
};

// 보호된 라우트 예시
router.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 일정관리 페이지 라우트 - 인증 검사 비활성화 (개발 환경용)
router.get('/calendar', (req, res) => {
  // 인증 검사 없이 직접 페이지 제공
  console.log('일정관리 페이지 접근 - 인증 검사 비활성화');
  res.sendFile(path.join(__dirname, '../public/calendar.html'));
});

module.exports = router;
