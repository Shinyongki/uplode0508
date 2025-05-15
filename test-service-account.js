require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// 서비스 계정 설정
const SERVICE_ACCOUNT_KEY_PATH = './service-account.json';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function main() {
  try {
    console.log('구글 시트 서비스 계정 연결 테스트 시작');
    console.log('스프레드시트 ID:', SPREADSHEET_ID);
    
    // 서비스 계정 키 파일 확인
    console.log('서비스 계정 키 파일:', fs.existsSync(SERVICE_ACCOUNT_KEY_PATH) ? '있음' : '없음');
    
    // 서비스 계정 키 파일로 JWT 클라이언트 생성
    const keyFile = path.resolve(SERVICE_ACCOUNT_KEY_PATH);
    console.log('서비스 계정 키 파일 경로:', keyFile);
    
    const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    console.log('서비스 계정 이메일:', key.client_email);
    
    // JWT 클라이언트 생성
    const auth = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    // 구글 시트 API 초기화
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 스프레드시트 정보 가져오기
    console.log('스프레드시트 정보 가져오는 중...');
    const spreadsheetInfo = await sheets.spreadsheets.get({ 
      spreadsheetId: SPREADSHEET_ID 
    });
    
    console.log('스프레드시트 제목:', spreadsheetInfo.data.properties.title);
    console.log('시트 목록:');
    const sheetTitles = spreadsheetInfo.data.sheets.map(s => s.properties.title);
    sheetTitles.forEach(title => console.log(`- ${title}`));
    
    // 첫 번째 시트의 데이터 가져오기
    if (sheetTitles.length > 0) {
      const firstSheet = sheetTitles[0];
      console.log(`\n첫 번째 시트 "${firstSheet}" 데이터 확인 중...`);
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${firstSheet}!A1:E5`,
      });
      
      const rows = response.data.values;
      if (rows && rows.length > 0) {
        console.log('헤더:', rows[0]);
        console.log(`총 ${rows.length - 1}개 행의 데이터 있음`);
        console.log('데이터 샘플:');
        rows.slice(1, Math.min(rows.length, 4)).forEach((row, i) => {
          console.log(`  ${i+1}. ${row.join(', ')}`);
        });
      } else {
        console.log('데이터가 없습니다.');
      }
    }
    
    console.log('\n서비스 계정 연결 테스트 성공!');
  } catch (error) {
    console.error('오류 발생:', error.message);
    console.error(error.stack);
  }
}

main();
