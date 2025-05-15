// Vercel 서버리스 함수로 Express 앱을 래핑
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const morgan = require('morgan');

// 라우트 가져오기 - 서버 파일과 상대 경로가 달라지므로 경로 조정
const apiRoutes = require('../routes/api');
const authRoutes = require('../routes/auth');

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
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: '서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Vercel을 위한 서버리스 함수 내보내기
module.exports = app; 