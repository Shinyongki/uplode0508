require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const { google } = require('googleapis');

// 라우트 가져오기
const apiRoutes = require('./routes/api/index');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// 환경 변수 설정 (기존 환경 변수가 없는 경우에만 설정)
process.env.USE_SERVICE_ACCOUNT = process.env.USE_SERVICE_ACCOUNT || 'true';

// 구글시트 인증 설정
const authGoogle = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'service-account.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// 구글시트 API 클라이언트 생성
const sheets = google.sheets({ version: 'v4', auth: authGoogle });

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
const startServer = (port) => {
  const server = app.listen(port)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`포트 ${port}가 이미 사용 중입니다. 다른 포트(${port + 1})로 시도합니다.`);
        startServer(port + 1);
      } else {
        console.error('서버 시작 오류:', err);
      }
    })
    .on('listening', () => {
      console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
    });
};

// 초기 포트로 서버 시작 시도
startServer(PORT); 