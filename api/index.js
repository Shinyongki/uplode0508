// Vercel 서버리스 함수로 Express 앱을 래핑
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const morgan = require('morgan');

// 환경 변수 로깅
console.log('NODE_VERSION:', process.version);
console.log('USE_SERVICE_ACCOUNT:', process.env.USE_SERVICE_ACCOUNT);
console.log('SERVICE_ACCOUNT_KEY_PATH exists:', process.env.SERVICE_ACCOUNT_KEY_PATH);
console.log('SPREADSHEET_ID exists:', !!process.env.SPREADSHEET_ID);
console.log('SERVICE_ACCOUNT_CLIENT_EMAIL exists:', !!process.env.SERVICE_ACCOUNT_CLIENT_EMAIL);
console.log('SERVICE_ACCOUNT_PRIVATE_KEY exists:', !!process.env.SERVICE_ACCOUNT_PRIVATE_KEY);
console.log('NODE_ENV:', process.env.NODE_ENV);

// API 라우터 및 기존 라우트 가져오기
const apiRouter = require('./_routes');
let authRoutes;

try {
  authRoutes = require('../routes/auth');
  console.log('인증 라우터 로드 성공');
} catch (error) {
  console.error('인증 라우터 로드 실패, 기본 인증 라우터를 사용합니다:', error.message);
  // 기본 인증 라우터 (오류 시 사용)
  authRoutes = express.Router();
  authRoutes.post('/login', (req, res) => {
    res.status(200).json({ status: 'success', message: '로그인 성공 (기본 핸들러)' });
  });
}

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: true
}));

// 라우트 설정
app.use('/api', apiRouter); // 새로운 API 라우터 사용
app.use('/auth', authRoutes);

// 디버그 엔드포인트 추가
app.get('/debug-env', (req, res) => {
  res.status(200).json({
    nodeVersion: process.version,
    useServiceAccount: process.env.USE_SERVICE_ACCOUNT,
    serviceAccountKeyPath: process.env.SERVICE_ACCOUNT_KEY_PATH,
    spreadsheetIdExists: !!process.env.SPREADSHEET_ID,
    serviceAccountClientEmailExists: !!process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
    serviceAccountPrivateKeyExists: !!process.env.SERVICE_ACCOUNT_PRIVATE_KEY,
    env: process.env.NODE_ENV
  });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  console.error(err.stack);
  
  res.status(500).json({
    status: 'error',
    message: '서버 오류가 발생했습니다. 구글 시트 연결을 확인해주세요.',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Vercel을 위한 서버리스 함수 내보내기
module.exports = app; 