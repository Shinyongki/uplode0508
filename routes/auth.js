const express = require('express');
const router = express.Router();
const { login, getCurrentUser, logout } = require('../controllers/authController');
const { authenticateToken } = require('../config/jwt');
const { saveToken } = require('../config/googleSheets');

// 디버깅용 미들웨어
router.use((req, res, next) => {
  console.log(`Auth 라우트 요청: ${req.method} ${req.url}`);
  next();
});

// 로그인
router.post('/login', login);

// 로그아웃
router.post('/logout', logout);

// 현재 로그인한 사용자 정보
router.get('/current', authenticateToken, getCurrentUser);

// 구글 OAuth 콜백 처리
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('인증 코드가 없습니다.');
    }
    
    // 토큰 저장
    const success = await saveToken(code);
    
    if (success) {
      return res.send('<h1>인증이 완료되었습니다</h1><p>이 창을 닫고 애플리케이션으로 돌아가세요.</p>');
    } else {
      return res.status(500).send('토큰 저장 중 오류가 발생했습니다.');
    }
  } catch (error) {
    console.error('구글 OAuth 콜백 처리 중 오류:', error);
    return res.status(500).send('인증 처리 중 오류가 발생했습니다.');
  }
});

module.exports = router; 