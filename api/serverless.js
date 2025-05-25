// Vercel 서버리스 함수 핸들러
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const { google } = require('googleapis');

// 환경 변수 설정
process.env.USE_SERVICE_ACCOUNT = process.env.USE_SERVICE_ACCOUNT || 'true';
process.env.SPREADSHEET_ID = process.env.SPREADSHEET_ID || '11eWVWRY2cTU5nat3zsTSTjvhvk-LxhistC1LmfBNvPU';

// 초기화 로그
console.log('Vercel serverless function initializing');
console.log('NODE_VERSION:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SPREADSHEET_ID exists:', !!process.env.SPREADSHEET_ID);
console.log('SERVICE_ACCOUNT_KEY exists:', !!process.env.SERVICE_ACCOUNT_KEY);

// Express 앱 생성
const app = express();

// CORS 설정
app.use(cors({
  credentials: true,
  origin: function(origin, callback) {
    // 모든 출처 허용 (개발 환경용)
    callback(null, true);
  }
}));

// 기본 미들웨어
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 상태 확인 엔드포인트
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 기본 API 응답
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'API 서버가 정상 작동 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// 위원별 담당기관 데이터 (하드코딩된 기본 데이터)
const committeeOrgData = [
  ['위원ID', '위원명', '기관ID', '기관코드', '기관명', '지역', '담당구분', '상태'],
  ['C001', '신용기', 'O001', 'A48170002', '산청한일노인통합복지센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O002', 'A48820003', '함안노인복지센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O003', 'A48170003', '진주노인통합지원센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O004', 'A48240001', '김해시니어클럽', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O005', 'A48240002', '창원도우누리노인종합재가센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O006', 'A48840001', '마산시니어클럽', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O007', 'A48840002', '거제노인통합지원센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O008', 'A48850001', '동진노인종합복지센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O009', 'A48850002', '생명의전화노인복지센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O010', 'A48170001', '보현행정노인복지센터', '경상남도', '주담당', '정상'],
  ['C001', '신용기', 'O011', 'B12345678', '부담당 기관1', '경상남도', '부담당', '정상'],
  ['C001', '신용기', 'O012', 'B87654321', '부담당 기관2', '경상남도', '부담당', '정상']
];

// 위원별 담당기관 API 엔드포인트
app.get('/api/sheets/organizations', (req, res) => {
  try {
    console.log('위원별 담당기관 API 호출됨');
    // 클라이언트가 기대하는 형식으로 데이터 반환 - 배열 직접 반환
    res.status(200).json(committeeOrgData);
  } catch (error) {
    console.error('위원별 담당기관 API 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 위원별 담당기관 매칭 API 엔드포인트
app.get('/api/committees/matching', (req, res) => {
  try {
    console.log('위원별 담당기관 매칭 API 호출됨');
    
    // 기본 매칭 데이터 생성
    const matchings = committeeOrgData.slice(1).map((row, index) => {
      return {
        id: `M${index + 1}`,
        committeeId: row[0],
        committeeName: row[1],
        orgId: row[2],
        orgCode: row[3],
        orgName: row[4],
        region: row[5],
        role: row[6] === '주담당' ? 'main' : 'sub',
        status: row[7]
      };
    });
    
    // 클라이언트가 기대하는 형식으로 데이터 반환 - 배열 직접 반환
    res.status(200).json(matchings);
  } catch (error) {
    console.error('위원별 담당기관 매칭 API 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 기관 목록 API 엔드포인트
app.get('/api/organizations', (req, res) => {
  try {
    console.log('기관 목록 API 호출됨');
    
    // 기본 기관 데이터 생성
    const organizations = committeeOrgData.slice(1).map((row, index) => {
      return {
        id: row[2],
        code: row[3],
        name: row[4],
        region: row[5],
        status: row[7]
      };
    });
    
    // 중복 제거 (기관 코드 기준)
    const uniqueOrgs = [];
    const orgCodes = new Set();
    
    for (const org of organizations) {
      if (!orgCodes.has(org.code)) {
        orgCodes.add(org.code);
        uniqueOrgs.push(org);
      }
    }
    
    // 클라이언트가 기대하는 형식으로 데이터 반환 - 클라이언트 코드와 호환을 위해 객체 형태로 반환
    res.status(200).json({
      status: 'success',
      organizations: {
        main: uniqueOrgs,
        sub: []
      }
    });
  } catch (error) {
    console.error('기관 목록 API 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 로그인 API 엔드포인트
app.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`로그인 시도: ${username}`);
    
    // 간단한 인증 로직 (실제 환경에서는 보안 강화 필요)
    if (username === '마스터' || username === 'master') {
      res.status(200).json({
        status: 'success',
        message: '로그인 성공',
        token: 'sample-jwt-token',
        user: {
          id: 'M001',
          name: '마스터',
          role: 'master',
          isAdmin: true
        }
      });
    } else if (username === '신용기' || username === 'C001') {
      res.status(200).json({
        status: 'success',
        message: '로그인 성공',
        token: 'sample-jwt-token-committee',
        user: {
          id: 'C001',
          name: '신용기',
          role: 'committee',
          isAdmin: false
        }
      });
    } else {
      res.status(401).json({
        status: 'error',
        message: '로그인 실패: 사용자 정보가 일치하지 않습니다.'
      });
    }
  } catch (error) {
    console.error('로그인 API 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    status: 'error',
    message: '서버 오류가 발생했습니다.',
    error: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 404 처리
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: '요청하신 페이지를 찾을 수 없습니다.',
    path: req.path,
    method: req.method
  });
});

// 정적 파일 서빙 설정 (index.html 및 기타 정적 파일)
app.use(express.static(path.join(__dirname, '../public')));

// 루트 경로에 대한 처리 (index.html 서빙)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 기타 모든 경로에 대한 처리 (SPA 지원)
app.get('*', (req, res, next) => {
  // API 요청이나 정적 파일 요청이 아닌 경우 index.html 서빙
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/auth/')) {
    res.sendFile(path.join(__dirname, '../index.html'));
  } else {
    next();
  }
});

// Vercel 서버리스 함수 핸들러
module.exports = (req, res) => {
  // 요청 로깅
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // CORS 헤더 수동 설정 (필요한 경우)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  
  // OPTIONS 요청에 대한 사전 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Express 앱으로 요청 전달
  return app(req, res);
};
