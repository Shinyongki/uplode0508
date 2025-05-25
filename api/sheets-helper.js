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
    
    // 개행 문자 처리 - 다양한 형식 지원
    let formattedPrivateKey = privateKey;
    
    // Vercel 환경에서는 JSON 문자열이 이스케이프되는 경우가 있어 추가 처리
    if (privateKey.includes('\\n')) {
      formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // 키가 따옴표로 감싸져 있는 경우 처리
    if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
      formattedPrivateKey = formattedPrivateKey.slice(1, -1);
    }
    
    console.log('[sheets-helper] Successfully parsed service account from environment variables');
    
    return {
      client_email: clientEmail,
      private_key: formattedPrivateKey,
      // 서비스 계정 키의 다른 필드들은 인증에 필요 없으므로 생략
      // 다만 필요한 경우 아래 필드들을 추가할 수 있음
      type: "service_account",
      project_id: process.env.SERVICE_ACCOUNT_PROJECT_ID || "uplode0508",
      private_key_id: process.env.SERVICE_ACCOUNT_PRIVATE_KEY_ID || ""
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
 * @param {string} spreadsheetId - 스프레드시트 ID
 * @param {string} range - 읽을 범위 (예: 'Sheet1!A1:B10')
 * @returns {Promise<Array<Array<string>>>} 시트 데이터
 */
async function readSheetData(spreadsheetId, range) {
  try {
    // spreadsheetId가 제공되지 않으면 환경 변수 사용
    const sheetId = spreadsheetId || SPREADSHEET_ID;
    
    if (!sheetId) {
      throw new Error('스프레드시트 ID가 제공되지 않았고 환경 변수도 설정되지 않았습니다');
    }
    
    // 시트 이름과 범위 분리
    let sheetName = '';
    let rangeSpec = range;
    
    if (range.includes('!')) {
      const parts = range.split('!');
      sheetName = parts[0];
      rangeSpec = parts[1];
      
      // 시트 이름 특수문자 처리
      if (sheetName.includes(' ') || /[^a-zA-Z0-9_]/.test(sheetName)) {
        // 이미 따옴표가 있는지 확인
        if (!(sheetName.startsWith('\'') && sheetName.endsWith('\'')) && 
            !(sheetName.startsWith('"') && sheetName.endsWith('"'))) {
          // 따옴표 추가
          sheetName = `'${sheetName}'`;
        }
      }
      
      // 새 범위 재조합
      range = `${sheetName}!${rangeSpec}`;
    }
    
    console.log(`[sheets-helper] 시트 데이터 읽기 시도 - 스프레드시트 ID: ${sheetId}, 범위: ${range}`);
    
    try {
      const sheets = await getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });
      
      console.log(`[sheets-helper] 시트 데이터 로드 성공 - 행 개수: ${response.data.values ? response.data.values.length : 0}`);
      return response.data.values || [];
    } catch (error) {
      // 시트 이름에 문제가 있는 경우 다른 방식 시도
      if (sheetName && error.message.includes('Unable to parse range')) {
        console.log(`[sheets-helper] 시트 이름 형식 문제, 다른 방식 시도`);
        
        // 시도 1: URL 인코딩 사용
        try {
          const encodedSheetName = encodeURIComponent(sheetName.replace(/['"]*/g, ''));
          const newRange = `${encodedSheetName}!${rangeSpec}`;
          console.log(`[sheets-helper] URL 인코딩 시도: ${newRange}`);
          
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: newRange,
          });
          
          console.log(`[sheets-helper] URL 인코딩 방식 성공 - 행 개수: ${response.data.values ? response.data.values.length : 0}`);
          return response.data.values || [];
        } catch (error2) {
          console.error(`[sheets-helper] URL 인코딩 방식 실패:`, error2.message);
          
          // 시도 2: 시트 ID로 접근
          try {
            // 시트 목록 가져오기
            const sheetsInfo = await sheets.spreadsheets.get({
              spreadsheetId: sheetId,
            });
            
            // 시트 이름으로 시트 ID 찾기
            const targetSheet = sheetsInfo.data.sheets.find(sheet => 
              sheet.properties.title.replace(/['"]*/g, '') === sheetName.replace(/['"]*/g, ''));
            
            if (targetSheet) {
              const sheetId = targetSheet.properties.sheetId;
              console.log(`[sheets-helper] 시트 ID 찾음: ${sheetId} (시트명: ${targetSheet.properties.title})`);
              
              // 시트 ID로 데이터 가져오기
              const gridRange = rangeSpec.split(':');
              const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${targetSheet.properties.title}!${rangeSpec}`,
              });
              
              console.log(`[sheets-helper] 시트 ID 방식 성공 - 행 개수: ${response.data.values ? response.data.values.length : 0}`);
              return response.data.values || [];
            } else {
              throw new Error(`시트 이름 '${sheetName}'을 찾을 수 없습니다.`);
            }
          } catch (error3) {
            console.error(`[sheets-helper] 시트 ID 방식 실패:`, error3.message);
            throw error3;
          }
        }
      } else {
        throw error;
      }
    }
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

/**
 * 구글 시트에서 행 삭제
 * @param {string} sheetName - 시트 이름 (예: 'Sheet1' 또는 '일정_관리')
 * @param {number} rowIndex - 삭제할 행 번호 (1부터 시작, 헤더 행도 포함)
 * @returns {Promise<object>} 응답 객체
 */
async function deleteRow(sheetName, rowIndex) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID environment variable is not set');
    }
    
    // Google Sheets API를 사용하여 행 삭제 처리
    // 방법 1: 해당 행을 빈 값으로 대체
    try {
      console.log(`[sheets-helper] 행 삭제 시도 - 시트: ${sheetName}, 행: ${rowIndex}`);
      
      // 시트 행 너비 확인
      const sheets = await getSheetsClient();
      const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [sheetName],
        includeGridData: false
      });
      
      // 시트 ID 가져오기
      const sheet = sheetInfo.data.sheets[0];
      const sheetId = sheet.properties.sheetId;
      
      // 삭제 요청 (batchUpdate 사용)
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // API는 0부터 시작하지만 rowIndex는 1부터 시작하민로 -1
                  endIndex: rowIndex // 끝 인덱스는 포함되지 않음
                }
              }
            }
          ]
        }
      });
      
      console.log(`[sheets-helper] 행 삭제 성공 - 시트: ${sheetName}, 행: ${rowIndex}`);
      return response.data;
    } catch (deleteError) {
      console.error(`[sheets-helper] 행 삭제 오류:`, deleteError.message);
      
      // 실패하면 대체 전략: 해당 행을 빈 데이터로 대체
      console.log(`[sheets-helper] 행 삭제 실패, 빈 데이터로 상태 변경 시도`);
      
      // 총 열 수 확인 (API에서 첫 행 가져오기)
      const headerData = await readSheetData(SPREADSHEET_ID, `${sheetName}!1:1`);
      const columnCount = headerData[0].length;
      
      // 빈 데이터 생성
      const emptyRow = new Array(columnCount).fill('');
      
      // 빈 데이터로 업데이트
      const response = await writeSheetData(`${sheetName}!A${rowIndex}:${String.fromCharCode(65 + columnCount - 1)}${rowIndex}`, [emptyRow]);
      
      console.log(`[sheets-helper] 행 비우기 성공 - 시트: ${sheetName}, 행: ${rowIndex}`);
      return response;
    }
  } catch (error) {
    console.error(`[sheets-helper] 행 삭제 중 오류:`, error.message);
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
  deleteRow,
  getFallbackData
}; 