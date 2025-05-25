require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const fs = require('fs');
const { google } = require('googleapis');

// 라우트 가져오기
const apiRoutes = require('./routes/api/index');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// 환경 변수 설정 (기존 환경 변수가 없는 경우에만 설정)
process.env.USE_SERVICE_ACCOUNT = process.env.USE_SERVICE_ACCOUNT || 'true';

// Vercel 환경에서 서비스 계정 키 처리
let authGoogle;
let sheets;

try {
  // 환경 변수에서 서비스 계정 키를 가져와 파일로 저장 (Vercel 환경용)
  if (process.env.SERVICE_ACCOUNT_KEY) {
    try {
      console.log('환경 변수에서 서비스 계정 키를 가져옵니다.');
      const serviceAccountPath = path.join(__dirname, 'service-account.json');
      fs.writeFileSync(serviceAccountPath, process.env.SERVICE_ACCOUNT_KEY);
      process.env.SERVICE_ACCOUNT_KEY_PATH = serviceAccountPath;
      console.log('서비스 계정 키 파일이 생성되었습니다:', serviceAccountPath);
    } catch (writeError) {
      console.error('서비스 계정 키 파일 저장 중 오류:', writeError);
      // 파일 저장 실패 시 기본 값 설정
      process.env.SERVICE_ACCOUNT_KEY_PATH = './service-account.json';
    }
  } else {
    console.log('환경 변수에 서비스 계정 키가 없습니다. 파일 시스템에서 찾습니다.');
  }

  // 서비스 계정 키 파일 존재 확인
  const keyFilePath = path.join(__dirname, 'service-account.json');
  const keyFileExists = fs.existsSync(keyFilePath);
  console.log(`서비스 계정 키 파일 존재 여부: ${keyFileExists}`);

  try {
    // 구글시트 인증 설정
    authGoogle = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // 구글시트 API 클라이언트 생성
    sheets = google.sheets({ version: 'v4', auth: authGoogle });
    console.log('Google Sheets API 클라이언트가 성공적으로 초기화되었습니다.');
  } catch (authError) {
    console.error('Google Sheets API 인증 중 오류 발생:', authError);
    // 인증 실패에도 서버 실행 계속
  }
} catch (error) {
  console.error('Google Sheets API 초기화 중 오류 발생:', error);
  // 초기화 오류에도 서버 실행 계속
}

// 기본 미들웨어 설정
app.use(cors({
  credentials: true,
  origin: function(origin, callback) {
    // 로컬 개발 환경 또는 Vercel 도메인 허용
    const allowedOrigins = [
      'http://localhost:3000',
      'https://upload0414.vercel.app',
      'https://upload0414-git-master.vercel.app',
      'https://uplode0508.vercel.app',
      'https://uplode0508-git-main.vercel.app',
      'https://committee-monitoring-system.vercel.app'
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

// 위원별 담당기관 데이터를 가져오는 API 엔드포인트
app.get('/api/sheets/organizations', async (req, res) => {
  try {
    // 구글시트 ID와 범위 설정
    const spreadsheetId = '11eWVWRY2cTU5nat3zsTSTjvhvk-LxhistC1LmfBNvPU';
    const range = '위원별_담당기관!A:G'; // A:C에서 A:G로 변경하여 G열(담당유형)까지 포함

    // 요청에서 위원명 가져오기 (기본값: 신용기)
    const committeeName = req.query.committeeName || '신용기';
    console.log(`구글시트 데이터 요청: 위원명=${committeeName}, 범위=${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    console.log(`구글시트 원본 데이터: ${rows ? rows.length : 0}행`);

    if (!rows || rows.length === 0) {
      console.log('구글시트 데이터가 없습니다.');
      return res.status(404).json({ error: '데이터가 없습니다.' });
    }

    // 데이터 파싱
    const organizations = {
      main: [],
      sub: []
    };

    // 헤더 제외하고 데이터 처리
    for (let i = 1; i < rows.length; i++) {
      // 시트 구조에 맞게 데이터 추출
      const [committeeId, rowCommitteeName, orgId, orgCode, orgName, region, role] = rows[i];
      
      // 요청한 위원명과 일치하는 데이터만 처리
      if (rowCommitteeName && rowCommitteeName.trim() === committeeName) {
        if (role && role.trim() === '주담당') {
          organizations.main.push({
            id: orgId || orgCode,
            code: orgCode,
            name: orgName,
            region: region || '경상남도'
          });
        } else if (role && role.trim() === '부담당') {
          organizations.sub.push({
            id: orgId || orgCode,
            code: orgCode,
            name: orgName,
            region: region || '경상남도'
          });
        }
      }
    }

    // 기관 코드만 필요한 경우를 위해 코드 배열도 함께 제공
    const mainCodes = organizations.main.map(org => org.code);
    const subCodes = organizations.sub.map(org => org.code);

    console.log(`구글시트에서 가져온 ${committeeName} 위원 담당기관: 주담당 ${organizations.main.length}개, 부담당 ${organizations.sub.length}개`);
    
    res.json({
      status: 'success',
      organizations: {
        main: mainCodes,
        sub: subCodes
      },
      organizationObjects: {
        main: organizations.main,
        sub: organizations.sub
      }
    });
  } catch (error) {
    console.error('구글시트 데이터 조회 실패:', error);
    res.status(500).json({
      status: 'error',
      message: '구글시트 데이터를 가져오는데 실패했습니다.',
      error: error.message
    });
  }
});

// 위원별 담당기관 매칭 데이터를 가져오는 API 엔드포인트
app.get('/api/sheets/committee-orgs', require('./api/committee-orgs'));

// 404 에러 처리
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    status: 'error',
    message: '요청한 리소스를 찾을 수 없습니다.'
  });
});

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Vercel 환경에서 사용할 기본 라우트 추가
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    googleSheetsInitialized: !!sheets
  });
});

// Vercel 환경에서는 서버를 시작하지 않음
if (process.env.NODE_ENV !== 'production') {
  // 로컬 환경에서만 서버 시작
  const startServer = (port) => {
    const server = app.listen(port)
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying ${port + 1}`);
          startServer(port + 1);
        } else {
          console.error('Server error:', err);
        }
      })
      .on('listening', () => {
        console.log(`Server started on port ${port}`);
      });
    
    return server;
  };

  // 초기 포트로 서버 시작
  startServer(PORT);
  
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 서버 정보 출력
  console.log('Server configuration:');
  console.log(`- Port: ${PORT}`);
  console.log(`- Google Sheets API: ${process.env.USE_SERVICE_ACCOUNT === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`- Session Secret: ${process.env.SESSION_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`- JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
} else {
  // Vercel 환경에서는 정보만 출력
  console.log(`Vercel serverless function initialized`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Google Sheets API: ${process.env.USE_SERVICE_ACCOUNT === 'true' ? 'Enabled' : 'Disabled'}`);
}

// Vercel 환경에서 사용할 모듈 내보내기
module.exports = app;