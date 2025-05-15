require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');

// 라우트 가져오기
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// 기본 미들웨어 설정
app.use(cors({
  credentials: true,
  origin: function(origin, callback) {
    // 로컬 개발 환경 또는 Vercel 도메인 허용
    const allowedOrigins = [
      'http://localhost:3000',
      'https://upload0414.vercel.app',
      'https://upload0414-git-master.vercel.app'
    ];
    
    // origin이 undefined인 경우(예: 서버-서버 요청)나 허용된 도메인인 경우 허용
    const originIsAllowed = !origin || allowedOrigins.includes(origin);
    
    console.log(`CORS 요청 origin: ${origin}, 허용여부: ${originIsAllowed}`);
    
    if (originIsAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS 정책에 의해 차단됨'));
    }
  }
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 세션 설정 - 메모리 세션으로 변경
app.use(session({
  secret: process.env.SESSION_SECRET || 'monitoring_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,  // 로컬 환경에서는 false로 설정
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24시간
    sameSite: 'lax'  // CSRF 보호
  }
}));

// connect-flash 설정
app.use(flash());

// req.flash가 없을 때 대체 함수 제공
app.use((req, res, next) => {
  if (!req.flash) {
    req.flash = function(type, message) {
      if (!req.session.flash) {
        req.session.flash = {};
      }
      if (!req.session.flash[type]) {
        req.session.flash[type] = [];
      }
      if (message) {
        req.session.flash[type].push(message);
      }
      return req.session.flash[type];
    };
  }
  next();
});

// 디버깅용 미들웨어
app.use((req, res, next) => {
  console.log(`요청 수신: ${req.method} ${req.url}`);
  if (req.session && req.session.committee) {
    console.log(`인증된 사용자: ${req.session.committee.name}`);
  } else {
    console.log('인증되지 않은 요청');
  }
  next();
});

// 라우트 설정
console.log('API 라우트 설정 시작...');
// API 라우트: /api/* 경로 처리 
app.use('/api', apiRoutes);
console.log('API 라우트 설정 완료');

console.log('인증 라우트 설정 시작...');
// 인증 라우트: /auth/* 경로 처리
app.use('/auth', authRoutes);
console.log('인증 라우트 설정 완료');

console.log('기본 라우트 설정 시작...');
// 기본 페이지 라우트: 위의 모든 라우트에 해당하지 않는 경로 처리
app.use('/', indexRoutes);
console.log('기본 라우트 설정 완료');

// SPA 지원을 위한 기본 경로 - API 경로가 아닌 모든 요청은 index.html로 제공
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// 404 에러 처리
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    status: 'error',
    message: '요청한 리소스를 찾을 수 없습니다.'
  });
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: '서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
}); 