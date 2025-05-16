// Google Sheets API 접근을 위한 도우미 모듈
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// 서비스 계정 설정
const USE_SERVICE_ACCOUNT = process.env.USE_SERVICE_ACCOUNT === 'true';
const SERVICE_ACCOUNT_KEY_PATH = process.env.SERVICE_ACCOUNT_KEY_PATH || './service-account.json';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 디버그 로그
console.log('[sheets-helper] Initializing with:');
console.log(`[sheets-helper] USE_SERVICE_ACCOUNT: ${USE_SERVICE_ACCOUNT}`);
console.log(`[sheets-helper] SERVICE_ACCOUNT_KEY_PATH: ${SERVICE_ACCOUNT_KEY_PATH}`);
console.log(`[sheets-helper] SPREADSHEET_ID exists: ${!!SPREADSHEET_ID}`);
console.log(`[sheets-helper] NODE_VERSION: ${process.version}`);
console.log(`[sheets-helper] NODE_ENV: ${process.env.NODE_ENV}`);

// 서비스 계정 키를 직접 환경 변수에서 가져오기 위한 함수
function getServiceAccountFromEnv() {
  try {
    const clientEmail = process.env.SERVICE_ACCOUNT_CLIENT_EMAIL;
    const privateKey = process.env.SERVICE_ACCOUNT_PRIVATE_KEY;
    
    if (!clientEmail || !privateKey) {
      console.log('[sheets-helper] Service account credentials not found in environment variables');
      return null;
    }
    
    // 개행 문자 처리
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    
    return {
      client_email: clientEmail,
      private_key: formattedPrivateKey
    };
  } catch (error) {
    console.error('[sheets-helper] Error parsing service account from env:', error.message);
    return null;
  }
}

/**
 * 구글 인증 클라이언트 생성
 * @returns {Promise<google.auth.JWT|null>} 인증된 구글 클라이언트
 */
async function getAuthClient() {
  try {
    if (USE_SERVICE_ACCOUNT) {
      console.log('[sheets-helper] Using service account authentication');
      
      // 방법 1: 파일에서 서비스 계정 키 읽기
      let keyData = null;
      
      // 먼저 환경 변수에서 서비스 계정 정보 확인
      const envKeyData = getServiceAccountFromEnv();
      if (envKeyData) {
        console.log('[sheets-helper] Using service account from environment variables');
        keyData = envKeyData;
      } else {
        // 파일에서 서비스 계정 키 읽기 시도
        try {
          // 키 파일 경로 확인
          const keyFilePath = path.resolve(SERVICE_ACCOUNT_KEY_PATH);
          console.log(`[sheets-helper] Service account key file path: ${keyFilePath}`);
          
          // 키 파일 존재 확인
          const keyFileExists = fs.existsSync(keyFilePath);
          console.log(`[sheets-helper] Service account key file exists: ${keyFileExists}`);
          
          if (!keyFileExists) {
            throw new Error('Service account key file not found at: ' + keyFilePath);
          }
          
          // 서비스 계정 키 파일로 JWT 클라이언트 생성
          const keyContent = fs.readFileSync(keyFilePath, 'utf8');
          keyData = JSON.parse(keyContent);
          console.log('[sheets-helper] Service account loaded from file');
        } catch (error) {
          console.error('[sheets-helper] Error loading service account from file:', error.message);
          throw error;
        }
      }
      
      // 필수 필드 확인
      if (!keyData || !keyData.client_email || !keyData.private_key) {
        throw new Error('Missing required fields in service account key');
      }
      
      console.log(`[sheets-helper] Service account email: ${keyData.client_email}`);
      
      // JWT 클라이언트 생성
      const authClient = new google.auth.JWT(
        keyData.client_email,
        null,
        keyData.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      
      // 클라이언트 인증 테스트
      try {
        await authClient.authorize();
        console.log('[sheets-helper] Service account authentication successful');
        return authClient;
      } catch (authError) {
        console.error('[sheets-helper] Service account authentication failed:', authError.message);
        throw authError;
      }
    } else {
      console.log('[sheets-helper] Service account not configured. Using OAuth or no authentication.');
      return null;
    }
  } catch (error) {
    console.error('[sheets-helper] Authentication error:', error.message);
    throw error;
  }
}

/**
 * Google Sheets API 클라이언트 생성
 * @returns {Promise<google.sheets_v4.Sheets>} 구글 시트 API 클라이언트
 */
async function getSheetsClient() {
  try {
    const authClient = await getAuthClient();
    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('[sheets-helper] Error creating sheets client:', error.message);
    throw error;
  }
}

/**
 * 시트 데이터 읽기
 * @param {string} range - 읽을 범위 (예: 'Sheet1!A1:B10')
 * @returns {Promise<Array<Array<string>>>} 시트 데이터
 */
async function readSheetData(range) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID environment variable is not set');
    }
    
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error(`[sheets-helper] Error reading sheet data from range ${range}:`, error.message);
    throw error;
  }
}

/**
 * 시트 데이터 쓰기
 * @param {string} range - 쓸 범위 (예: 'Sheet1!A1:B10')
 * @param {Array<Array<string>>} values - 쓸 데이터
 * @returns {Promise<object>} 응답 객체
 */
async function writeSheetData(range, values) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID environment variable is not set');
    }
    
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });
    
    return response.data;
  } catch (error) {
    console.error(`[sheets-helper] Error writing sheet data to range ${range}:`, error.message);
    throw error;
  }
}

// fallback 데이터(임시 데이터)
const fallbackData = {
  committees: [
    ['이름', 'ID', '역할'],
    ['신용기', 'C001', 'committee'],
    ['문일지', 'C002', 'committee'],
    ['김수연', 'C003', 'committee'],
    ['이연숙', 'C004', 'committee'],
    ['이정혜', 'C005', 'committee']
  ],
  committee_orgs: [
    ['기관코드', '기관명', '주담당', '부담당'],
    ['A48120001', '동진노인종합복지센터', '신용기', '김수연,이연숙'],
    ['A48120002', '창원도우누리노인복지센터', '신용기', '김수연'],
    ['A48120003', '마산시니어클럽', '문일지', '신용기'],
    ['A48120004', '김해시니어클럽', '김수연', '이정혜'],
    ['A48120005', '생명의전화노인복지센터', '이정혜', '문일지'],
    ['A48120006', '보현행정노인복지센터', '이연숙', '이정혜']
  ]
};

/**
 * Fallback 데이터 가져오기(API 연결 실패 시 사용)
 * @param {string} dataType - 데이터 타입
 * @returns {Array<Array<string>>} 정적 데이터
 */
function getFallbackData(dataType) {
  return fallbackData[dataType] || [];
}

module.exports = {
  getAuthClient,
  getSheetsClient,
  readSheetData,
  writeSheetData,
  getFallbackData
}; 