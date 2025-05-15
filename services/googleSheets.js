const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// 서비스 계정 환경변수 지원
const USE_SERVICE_ACCOUNT = process.env.USE_SERVICE_ACCOUNT === 'true';
const SERVICE_ACCOUNT_KEY_PATH = process.env.SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, '..', 'service-account.json');

// 파일 경로 설정
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');

// Google Sheets API를 사용하기 위한 인증 클라이언트 생성
async function getAuthClient() {
  // Debug: show service account branch and key path
  console.log('USE_SERVICE_ACCOUNT:', USE_SERVICE_ACCOUNT);
  console.log('SERVICE_ACCOUNT_KEY_PATH:', SERVICE_ACCOUNT_KEY_PATH);
  if (USE_SERVICE_ACCOUNT) {
    // 서비스 계정 키로 JWT 클라이언트 생성
    const key = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
    return new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
  }
  try {
    console.log('인증 클라이언트 생성 시작');
    // credentials.json 파일 읽기
    const credentialsPath = CREDENTIALS_PATH;
    const tokenPath = TOKEN_PATH;
    
    console.log(`자격 증명 파일 확인: ${fs.existsSync(credentialsPath)}`);
    console.log(`토큰 파일 확인: ${fs.existsSync(tokenPath)}`);
    
    const content = fs.readFileSync(credentialsPath);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.web;
    
    console.log('OAuth2 클라이언트 생성 중...');
    // OAuth2 클라이언트 생성
    const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]
    );
    
    // 기존 토큰이 있는지 확인
    if (fs.existsSync(tokenPath)) {
      console.log('토큰 파일 발견, 자격 증명 설정 중...');
      const token = JSON.parse(fs.readFileSync(tokenPath));
      oAuth2Client.setCredentials(token);
      console.log('자격 증명 설정 완료');
      return oAuth2Client;
    } else {
      console.error('토큰 파일을 찾을 수 없음:', tokenPath);
      throw new Error('토큰 파일이 존재하지 않습니다. 먼저 인증을 진행해주세요.');
    }
  } catch (error) {
    console.error('인증 클라이언트 생성 중 오류 발생:', error);
    console.error(error.stack);
    throw error;
  }
}

// 스프레드시트에서 데이터 읽기
async function readFromSheet(spreadsheetId, range) {
  try {
    console.log(`구글 시트 데이터 읽기 시작: 스프레드시트 ID ${spreadsheetId}, 범위 ${range}`);
    
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('시트 API 호출 시작');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    const values = response.data.values || [];
    console.log(`시트 데이터 읽기 성공: ${values.length}행 데이터`);
    
    if (values.length > 0 && values[0]) {
      console.log('첫 번째 행:', JSON.stringify(values[0]));
      console.log('컬럼 수:', values[0].length);
      
      // category와 지역 필드가 있는지 확인
      const hasCategoryField = values[0].includes('category');
      const hasRegionField = values[0].includes('지역');
      console.log(`category 필드 존재: ${hasCategoryField}, 지역 필드 존재: ${hasRegionField}`);
    }
    
    return values;
  } catch (error) {
    console.error('스프레드시트 데이터 읽기 오류:', error);
    console.error('오류 세부 정보:', error.errors || 'No detailed error information');
    throw error;
  }
}

// 스프레드시트에 데이터 쓰기
async function writeToSheet(spreadsheetId, range, values) {
  try {
    console.log(`구글 시트 데이터 쓰기 시작: 스프레드시트 ID ${spreadsheetId}, 범위 ${range}`);
    console.log(`쓰기 데이터: ${values.length}행`);
    
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    });
    
    console.log('데이터 쓰기 성공:', response.data);
    return response.data;
  } catch (error) {
    console.error('스프레드시트 데이터 쓰기 오류:', error);
    console.error('오류 세부 정보:', error.errors || 'No detailed error information');
    throw error;
  }
}

// 스프레드시트에 데이터 추가 (행 추가)
async function appendToSheet(spreadsheetId, range, values) {
  try {
    console.log(`구글 시트 데이터 추가 시작: 스프레드시트 ID ${spreadsheetId}, 범위 ${range}`);
    console.log(`추가 데이터: ${JSON.stringify(values)}`);
    
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    });
    
    console.log('데이터 추가 성공:', response.data);
    
    // 헤더 확인 
    try {
      // 헤더 확인을 위해 범위의 첫 번째 행만 읽기
      const headerRange = range.split('!')[0] + '!A1:J1';
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: headerRange,
      });
      
      const headerValues = headerResponse.data.values;
      if (headerValues && headerValues.length > 0) {
        console.log('현재 헤더:', JSON.stringify(headerValues[0]));
        
        // category와 지역 필드가 있는지 확인
        const hasCategoryField = headerValues[0].includes('category');
        const hasRegionField = headerValues[0].includes('지역');
        console.log(`헤더에 category 필드 존재: ${hasCategoryField}, 지역 필드 존재: ${hasRegionField}`);
        
        // 필요한 경우 헤더 업데이트
        if (!hasCategoryField || !hasRegionField) {
          console.log('필수 필드가 누락됨: 헤더 업데이트 필요');
        }
      } else {
        console.log('헤더 정보를 가져올 수 없음');
      }
    } catch (headerError) {
      console.warn('헤더 확인 중 오류 발생:', headerError);
    }
    
    return response.data;
  } catch (error) {
    console.error('스프레드시트 데이터 추가 오류:', error);
    console.error('오류 세부 정보:', error.errors || 'No detailed error information');
    throw error;
  }
}

// 지표 목록 시트 생성
function createIndicatorsSheet(ss) {
  var sheet = ss.getSheetByName("지표_목록");
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("지표_목록");
  }
  
  // 헤더 설정
  var headers = ["id", "code", "name", "category", "검토자료", "공통필수", "공통선택", "평가연계", "온라인점검", "현장점검", "description"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  
  // 실제 지표 데이터 추가 (문서 기반)
  var indicatorsData = [
    // 1. 매월 점검 지표 (15개)
    ["I001", "M001", "모인우리 수행기관 상세현황 현행화", "매월", "모인우리 수행기관 상세현황 정보", "O", "", "", "필수", "", "수행기관 상세현황 정보의 현행화 여부"],
    ["I002", "M002", "종사자 채용현황", "매월", "모인우리 배정 및 채용인원, 배정현황 변경 근거서류", "O", "", "O", "필수", "", "종사자 채용 현황 점검"],
    ["I003", "M003", "종사자 근속현황", "매월", "모인우리 배정 및 채용인원", "O", "", "O", "필수", "", "종사자 근속 현황 점검"],
    ["I004", "M004", "종사자 직무교육 이수율", "매월", "LMS 시스템 DB, 모인우리 배정 및 채용인원", "O", "", "", "필수", "", "종사자 직무교육 이수율 점검"],
    ["I005", "M005", "종사자 역량강화교육 이수율", "매월", "LMS 시스템 DB, 모인우리 배정 및 채용인원", "O", "", "", "필수", "", "종사자 역량강화교육 이수율 점검"],
    ["I006", "Y020", "(일반 및 중점) 선정조사일 준수", "매월", "노인맞춤돌봄시스템 DB", "", "O", "O", "선택", "우선", "선정조사일 준수 점검"],
    ["I007", "M007", "(일반 및 중점) 배정인원 대비 서비스 이용자 현황", "매월", "모인우리 배정 및 제공/채용인원, 노인맞춤돌봄시스템 DB", "O", "", "", "필수", "", "배정인원 대비 서비스 이용자 현황 점검"],
    ["I008", "M008", "(특화) 은둔형 집단 이용자 현황", "매월", "사업운영시스템 DB, 자문요청 결과보고서", "O", "", "", "필수", "", "은둔형 집단 이용자 현황 점검"],
    ["I009", "M009", "(특화) 우울형 집단 이용자 현황", "매월", "사업운영시스템 DB, 자문요청 결과보고서", "O", "", "", "필수", "", "우울형 집단 이용자 현황 점검"],
    ["I010", "M010", "(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수", "매월", "신청서, 제공 안내 및 동의서", "", "O", "O", "선택", "우선", "서비스 접수 및 선정조사 기한 준수 점검"],
    ["I011", "M011", "(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수", "매월", "(특화) 제공 안내 및 동의서", "", "O", "O", "선택", "우선", "서비스 접수 및 선정조사 기한 준수 점검"],
    ["I012", "M012", "(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수", "매월", "(특화) 사업운영시스템 DB, 사정척도지, 사례실무회의록, 제공계획서 및 재사정지", "", "O", "O", "선택", "우선", "서비스 접수 및 선정조사 기한 준수 점검"],
    ["I013", "M013", "중간관리자 배치 현황", "매월", "모인우리 배정 및 채용인원, 업무조직도(분장표) 등", "", "O", "O", "선택", "우선", "중간관리자 배치 현황 점검"],
    ["I014", "M014", "(일반 및 중점) 선정조사일 준수", "매월", "노인맞춤돌봄시스템 DB", "", "O", "O", "선택", "우선", "선정조사일 준수 여부 점검"],
    ["I015", "Y025", "(공통) 서비스 재사정", "매월", "(일반 및 중점) 노인맞춤돌봄시스템 DB", "", "O", "O", "선택", "우선", "서비스 재사정 여부 확인"],
    ["I033", "M006", "이용자 특이사항 보고", "연중", "이용자 특이사항 보고 현황(위기 대응(예방) 사례, 사건/사고 보고 등)", "O", "", "", "필수", "", "이용자 특이사항 보고 현황 점검"],
    
    // 2. 반기 점검 지표 (4개)
    ["I016", "H001", "(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수", "반기", "(특화) 사업운영시스템 DB", "", "O", "O", "선택", "우선", "서비스 접수 및 선정조사 기한 준수 점검"],
    ["I017", "H002", "(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수", "반기", "(특화) 사업운영시스템 DB, 중지 신청서", "", "O", "O", "선택", "우선", "서비스 접수 및 선정조사 기한 준수 점검"],
    ["I018", "H003", "(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수", "반기", "(특화) 사업운영시스템 DB, 종결신청서, 종결처리서, 사례실무회의록 등", "", "O", "O", "선택", "우선", "서비스 접수 및 선정조사 기한 준수 점검"],
    ["I019", "H004", "(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수", "반기", "(특화) 사례(상담) 기록지", "", "O", "O", "선택", "우선", "서비스 접수 및 선정조사 기한 준수 점검"],
    
    // 3. 연중 점검 지표 (모든 연중 지표 추가)
    ["I020", "Y001", "중간관리자 배치 현황", "연중", "모인우리 배정 및 채용인원, 업무조직도(분장표) 등", "", "O", "O", "선택", "우선", "중간관리자 배치 현황 점검"],
    ["I021", "Y002", "선임(전담, 생활지원사) 배치 현황", "연중", "모인우리 배정 및 채용인원, 업무조직도(분장표) 등", "", "O", "", "선택", "우선", "선임 배치 현황 점검"],
    ["I022", "Y003", "종사자(전담, 생활지원사) 배치 현황", "연중", "모인우리 배정 및 채용인원, 업무조직도(분장표) 등", "", "O", "", "선택", "우선", "종사자 배치 현황 점검"],
    ["I023", "Y004", "종사자(전담, 생활지원사) 겸직 현황", "연중", "모인우리 배정 및 채용인원, 업무조직도(분장표) 등", "", "O", "", "선택", "우선", "종사자 겸직 현황 점검"],
    ["I024", "Y005", "지원인력(사회서비스형 노인일자리 등) 활용 현황", "연중", "관련 서류", "", "O", "", "선택", "우선", "지원인력 활용 현황 점검"],
    ["I025", "Y006", "채용관리", "연중", "인사관련 서류, 종사자 임면보고, 보안서약서", "", "O", "", "선택", "우선", "채용관리 점검"],
    ["I026", "Y007", "복무관리", "연중", "복무관련 서류", "", "O", "", "선택", "우선", "복무관리 점검"],
    ["I027", "Y008", "수행기관 자격요건(시설, 인력, 기타) 준수", "연중", "위수탁 사업계획서, 현장확인", "O", "", "", "필수", "", "수행기관 자격요건 준수 여부 점검"],
    ["I028", "Y009", "장기요양·방문요양 제공 규모 제한 준수", "연중", "시군구 제출자료", "O", "", "", "필수", "", "제공 규모 제한 준수 여부 점검"],
    ["I029", "Y010", "예산 관리 및 운영 준수", "연중", "보조금(인건비, 운영비, 사업비) 집행 서류", "O", "", "", "필수", "", "예산 관리 및 운영 준수 여부 점검"],
    ["I030", "Y011", "노인맞춤돌봄협의체 참석", "연중", "협의체 참석 증빙 서류", "", "O", "O", "우선", "선택", "노인맞춤돌봄협의체 참석 여부 점검"],
    ["I031", "Y012", "실무협의회 참석", "연중", "협의회 참석 증빙 서류", "", "O", "O", "우선", "선택", "실무협의회 참석 여부 점검"],
    ["I032", "Y013", "유관기관 협력체계 구축 노력", "연중", "협력체계 증빙 서류", "", "O", "", "우선", "선택", "유관기관 협력체계 구축 노력 점검"],
    ["I034", "Y014", "이용자 권익 보호 규정 마련", "연중", "운영규정", "", "O", "O", "선택", "우선", "이용자 권익 보호 규정 마련 여부 점검"],
    ["I035", "Y015", "이용자 권익 보호 교육 실시", "연중", "교육계획서, 결과보고서 등", "", "O", "O", "선택", "우선", "이용자 권익 보호 교육 실시 여부 점검"],
    ["I036", "Y016", "이용자 민원접수 및 처리과정 문서화", "연중", "민원접수 및 처리과정 문서", "", "O", "O", "선택", "우선", "이용자 민원접수 및 처리과정 문서화 점검"],
    ["I037", "Y017", "이용자 안전관리 대응체계 마련", "연중", "대응체계 자료", "", "O", "O", "선택", "우선", "이용자 안전관리 대응체계 마련 여부 점검"],
    ["I038", "Y018", "혹서기·혹한기 보호대책 안전확인 조치", "연중", "보호대책 운영계획, 취약노인 명단, 안전확인 실시 결과", "", "O", "O", "선택", "우선", "혹서기·혹한기 보호대책 안전확인 조치 점검"],
    ["I039", "Y019", "요보호 대상자 연계", "연중", "요보호 대상자 의뢰, 연계 공문", "", "O", "", "선택", "우선", "요보호 대상자 연계 점검"],
    ["I040", "Y021", "(공통) 서비스 제공 안내", "연중", "(일반 및 중점) 제공 안내 및 동의서, 상호협력 동의서", "", "O", "O", "선택", "우선", "서비스 제공 안내 점검"],
    ["I041", "Y022", "(공통) 이용대기자 관리", "연중", "(일반 및 중점) 노인맞춤돌봄시스템 DB, 제공(예정) 안내서", "", "O", "O", "선택", "우선", "이용대기자 관리 점검"],
    ["I042", "Y023", "(공통) 서비스 중지 대상자 모니터링", "연중", "(일반 및 중점) 노인맞춤돌봄시스템 DB, 모니터링 일지", "", "O", "O", "선택", "우선", "서비스 중지 대상자 모니터링 점검"],
    ["I043", "Y024", "(일반 및 중점) 서비스 점검", "연중", "노인맞춤돌봄시스템 DB, 서비스 점검지", "", "O", "O", "선택", "우선", "서비스 점검 여부 확인"],
    ["I044", "Y026", "(공통) 서비스 종결처리", "연중", "(일반 및 중점) 노인맞춤돌봄시스템 DB, 종결 신청서/처리서, 사례실무희의록 등", "", "O", "O", "선택", "우선", "서비스 종결처리 점검"],
    ["I045", "Y027", "(특화) 이용자 선정의 적절성", "연중", "사정척도지, 상담관련 서류(초기상담지, 사례(상담) 기록지), 사례실무회의록, 우울증 진단서, 자문요청 결과보고서", "", "O", "", "선택", "우선", "이용자 선정의 적절성 점검"],
    ["I046", "Y028", "(공통) 서비스 제공계획 수립의 충실성", "연중", "(일반 및 중점) 선정 조사지, 상담지, 제공계획서, 사례실무회의록", "", "O", "", "선택", "우선", "서비스 제공계획 수립의 충실성 점검"],
    ["I047", "Y029", "(공통) 서비스 제공계획 수립의 충실성", "연중", "(특화) 사정척도지, 제공 계획서 및 재사정지, 사례실무회의록", "", "O", "", "선택", "우선", "서비스 제공계획 수립의 충실성 점검"],
    ["I048", "Y030", "(공통) 서비스 제공의 충실성", "연중", "(일반 및 중점) 제공기록지, 업무일지 등", "", "O", "", "선택", "우선", "서비스 제공의 충실성 점검"],
    ["I049", "Y031", "(공통) 서비스 제공의 충실성", "연중", "(특화) 사례(상담) 기록지, 집단 프로그램 계획서, 프로그램 변경 신청서, 집단 활동 일지, 집단 활동 강사 일지", "", "O", "", "선택", "우선", "서비스 제공의 충실성 점검"],
    ["I050", "Y032", "(공통) 서비스 재사정의 적절성", "연중", "(일반 및 중점) 선정 조사지, 상담지, 제공 계획서", "", "O", "", "선택", "우선", "서비스 재사정의 적절성 점검"],
    ["I051", "Y033", "(공통) 서비스 재사정의 적절성", "연중", "(특화) 제공 계획서 및 재사정지, 사례실무회의록", "", "O", "", "선택", "우선", "서비스 재사정의 적절성 점검"],
    ["I052", "Y034", "(일반 및 중점) 사례실무회의의 적절성", "연중", "선정 조사지, 상담지, 제공 계획서, 사례실무회의록", "", "O", "", "선택", "우선", "사례실무회의의 적절성 점검"],
    ["I053", "Y035", "(공통) 종결 및 사후관리의 충실성", "연중", "(일반 및 중점) 선정 조사지, 상담지, 제공 계획서, 제공 기록지 등", "", "O", "", "선택", "우선", "종결 및 사후관리의 충실성 점검"],
    ["I054", "Y036", "(공통) 종결 및 사후관리의 충실성", "연중", "(특화) 종결 신청서, 종결 처리서, 사례(상담) 기록지, 사례실무회의록", "", "O", "", "선택", "우선", "종결 및 사후관리의 충실성 점검"],
    ["I055", "Y037", "(공통) 응급상황 대응 체계 구축 및 운영", "연중", "응급상황 대응 매뉴얼, 응급상황 대응 기록지, 응급상황 발생 보고서", "", "O", "", "선택", "우선", "응급상황 대응 체계 구축 및 운영 점검"],
    ["I056", "Y038", "(공통) 이용자 만족도", "연중", "이용자 만족도 조사 결과", "O", "", "", "필수", "", "이용자 만족도 조사 결과 확인"],
    ["I057", "Y039", "(공통) 제공인력 만족도", "연중", "제공인력 만족도 조사 결과", "O", "", "", "필수", "", "제공인력 만족도 조사 결과 확인"],
    ["I058", "Y040", "(공통) 응급상황 대응 체계 구축 및 운영", "연중", "응급상황 대응 매뉴얼, 응급상황 대응 기록지, 응급상황 발생 보고서", "", "O", "", "선택", "우선", "응급상황 대응 체계 구축 및 운영 점검"],
    ["I059", "Y041", "(공통) 사후관리", "연중", "(일반 및 중점) 노인맞춤돌봄서비스 DB, 사후관리 서류", "", "O", "", "선택", "우선", "사후관리 점검"],
    ["I060", "Y042", "(공통) 응급상황 대응 체계 구축 및 운영", "연중", "응급상황 대응 매뉴얼, 응급상황 대응 기록지, 응급상황 발생 보고서", "", "O", "", "선택", "우선", "응급상황 대응 체계 구축 및 운영 점검"],
    
    // 4. 연중(1~3월) 점검 지표 특별 항목 (3개)
    ["I061", "Q001", "배상·상해보험 가입", "1~3월", "가입자 명단, 보험증권 등", "", "O", "", "우선", "선택", "배상·상해보험 가입 여부 확인"],
    ["I062", "Q002", "사업계획 수립", "1~3월", "사업연도 노인맞춤돌봄서비스 사업계획서", "", "O", "", "우선", "선택", "사업계획 수립 여부 확인"],
    ["I063", "Q003", "사업평가", "1~3월", "전년도 노인맞춤돌봄서비스 사업계획서, 사업연도 노인맞춤돌봄서비스 사업계획서", "", "O", "", "우선", "선택", "사업평가 진행 여부 확인"]
  ];
  
  if (indicatorsData.length > 0) {
    sheet.getRange(2, 1, indicatorsData.length, headers.length).setValues(indicatorsData);
  }
  
  // 자동 열 너비 조정
  sheet.autoResizeColumns(1, headers.length);
  
  // 테이블 포맷 적용
  formatAsTable(sheet);
  
  // 카테고리별 색상 지정
  colorCodeByCategory(sheet, 4);
}

// 마스터 모니터링 시트 생성
async function createMasterMonitoringSheet(spreadsheetId) {
  try {
    console.log('마스터_모니터링 시트 생성 시작');
    
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 스프레드시트 정보 가져오기
    const spreadsheetInfo = await sheets.spreadsheets.get({ 
      spreadsheetId 
    });
    
    // 시트 목록 확인
    const sheetTitles = spreadsheetInfo.data.sheets.map(s => s.properties.title);
    console.log('기존 시트 목록:', sheetTitles);
    
    // 마스터_모니터링 시트가 이미 있는지 확인
    if (sheetTitles.includes('마스터_모니터링')) {
      console.log('마스터_모니터링 시트가 이미 존재합니다.');
      
      // 시트의 기존 데이터 가져오기
      const existingData = await readFromSheet(spreadsheetId, '마스터_모니터링!A:K');
      if (existingData && existingData.length > 0) {
        console.log('마스터_모니터링 시트에 데이터가 이미 있습니다. 기존 데이터 유지.');
        return { success: true, message: '마스터_모니터링 시트가 이미 존재합니다.' };
      }
      
      // 비어있는 시트라면 헤더 추가
      console.log('마스터_모니터링 시트는 존재하지만 비어있습니다. 헤더를 추가합니다.');
    } else {
      // 새 시트 추가
      console.log('마스터_모니터링 시트 생성 중...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: '마스터_모니터링'
              }
            }
          }]
        }
      });
      console.log('마스터_모니터링 시트 생성됨');
    }
    
    // 헤더 행 설정 (모니터링_결과_통합 시트와 동일한 구조로)
    const headers = [
      '기관ID', '기관코드', '기관명', '지표ID', '결과', '의견', 
      '평가월', '평가일자', 'category', '지역', '담당위원'
    ];
    
    // 헤더 행 추가
    await writeToSheet(spreadsheetId, '마스터_모니터링!A1:K1', [headers]);
    console.log('마스터_모니터링 시트 헤더 추가 완료');
    
    // 통합 시트 데이터 가져오기
    const integratedData = await readFromSheet(spreadsheetId, '모니터링_결과_통합!A:K');
    if (integratedData && integratedData.length > 1) {
      // 헤더를 제외한 데이터만 복사
      const dataToTransfer = integratedData.slice(1);
      console.log(`통합 시트에서 ${dataToTransfer.length}개 행 복사 중...`);
      
      // 마스터 시트에 데이터 쓰기 (A2부터 시작)
      if (dataToTransfer.length > 0) {
        const range = `마스터_모니터링!A2:K${dataToTransfer.length + 1}`;
        await writeToSheet(spreadsheetId, range, dataToTransfer);
        console.log('데이터 복사 완료');
      }
    } else {
      console.log('통합 시트에 복사할 데이터가 없습니다.');
    }
    
    return { 
      success: true, 
      message: '마스터_모니터링 시트 생성 및 데이터 초기화 완료' 
    };
  } catch (error) {
    console.error('마스터_모니터링 시트 생성 중 오류:', error);
    return { 
      success: false, 
      message: `마스터_모니터링 시트 생성 실패: ${error.message}` 
    };
  }
}

module.exports = {
  getAuthClient,
  readFromSheet,
  writeToSheet,
  appendToSheet,
  createIndicatorsSheet,
  createMasterMonitoringSheet
}; 