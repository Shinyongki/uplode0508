// 컨트롤러: 위원 관련 기능 처리
const Committee = require('../models/committee');
const { readSheetData, writeSheetData } = require('../config/googleSheets');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 모든 위원 정보 가져오기
const getAllCommittees = async (req, res) => {
  try {
    const committees = []; // 모델 연결 전에는 빈 배열 반환
    
    return res.status(200).json({
      status: 'success',
      data: { committees }
    });
  } catch (error) {
    console.error('모든 위원 정보 조회 중 오류:', error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 현재 인증된 위원 정보 가져오기
const getCurrentCommittee = async (req, res) => {
  try {
    // 세션에서 위원 정보 가져오기
    if (!req.session || !req.session.committee) {
      return res.status(401).json({
        status: 'error',
        message: '로그인이 필요합니다.'
      });
    }
    
    const committee = req.session.committee;
    
    return res.status(200).json({
      status: 'success',
      data: { committee }
    });
  } catch (error) {
    console.error('현재 위원 정보 조회 중 오류:', error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 구글 시트에서 모든 위원 정보 가져오기
const getAllCommitteesFromSheet = async (req, res) => {
  try {
    console.log('getAllCommitteesFromSheet 함수 호출됨');
    console.log('세션 정보:', req.session);
    
    // 마스터 계정 확인 - 임시로 주석 처리하여 모든 계정이 접근 가능하도록 함
    /*
    if (!req.session || !req.session.committee || req.session.committee.role !== 'master') {
      console.log('접근 권한 없음:', req.session?.committee?.role || '로그인하지 않음');
      return res.status(403).json({
        status: 'error',
        message: '마스터 관리자만 접근할 수 있습니다.'
      });
    }
    */
    
    // 구글 시트에서 위원 목록 가져오기 시도
    try {
      console.log('구글 시트에서 위원 목록 조회 중...');
      const sheetRange = 'committees!A:C'; // 위원 정보가 저장된 시트 범위
      const data = await readSheetData(SPREADSHEET_ID, sheetRange);

      if (data && data.length >= 2) {
        // 헤더를 제외한 실제 데이터
        const headers = data[0];
        const rows = data.slice(1);
        console.log(`총 ${rows.length}개 위원 데이터 로드됨`);

        // 위원 데이터 변환
        const committees = rows.map(row => {
          const committee = {};
          headers.forEach((header, index) => {
            if (row[index] !== undefined) {
              committee[header] = row[index];
            } else {
              committee[header] = '';
            }
          });
          return committee;
        });

        return res.status(200).json({
          status: 'success',
          data: { committees }
        });
      } else {
        console.log('구글 시트에서 위원 데이터를 찾을 수 없습니다.');
        // 빈 배열 반환
        return res.status(200).json({
          status: 'success',
          data: { committees: [] },
          message: '위원 데이터가 없습니다. 구글 시트에 데이터를 추가해주세요.'
        });
      }
    } catch (sheetError) {
      console.error('구글 시트 읽기 오류:', sheetError.message);
      throw sheetError; // 에러 전파하여 아래 catch 블록에서 처리
    }
  } catch (error) {
    console.error('위원 목록 조회 중 오류:', error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다. 구글 시트 연결을 확인해주세요.'
    });
  }
};

// 모든 위원-기관 매칭 정보 가져오기
const getAllCommitteeMatchings = async (req, res) => {
  try {
    console.log('위원-기관 매칭 정보 요청됨');
    
    // 개발 환경에서는 인증 체크 우회
    const bypassAuth = process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true';
    
    // 인증 완화 - 테스트 모드에서는 인증 없이도 접근 가능하도록 설정
    // 실제 운영 환경에서는 필요한 인증 로직 추가 필요
    const isTestMode = req.query.mode === 'test' || process.env.TEST_MODE === 'true';
    
    if (!bypassAuth && !isTestMode && (!req.session || !req.session.committee)) {
      return res.status(401).json({
        status: 'error',
        message: '인증이 필요합니다.'
      });
    }
    
    // 구글 시트에서 위원-기관 매칭 정보 가져오기
    console.log('구글 시트에서 위원-기관 매칭 정보 조회 중...');
    const sheetRange = '위원별_담당기관!A:H'; // 위원-기관 매칭 정보가 저장된 시트 범위 (점검유형 컬럼 추가)
    const data = await readSheetData(SPREADSHEET_ID, sheetRange);

    if (!data || data.length < 2) {
      console.log('위원-기관 매칭 데이터를 찾을 수 없습니다. 테스트 데이터를 사용합니다.');
      
      // 테스트 데이터 제공
      const testMatchings = [
        // 신용기 담당 기관 (기존 2개에서 확장)
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48120001', orgName: '동진노인통합지원센터', region: '창원시 의창구', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48720001', orgName: '의령노인통합지원센터', region: '의령군', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48120008', orgName: '경남노인통합지원센터', region: '창원시', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48120011', orgName: '창원사회적협동조합', region: '창원시', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48120013', orgName: '진해노인종합복지관', region: '창원시', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48250001', orgName: '효동원노인통합지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48250005', orgName: '생명의전화노인통합지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48250006', orgName: '보현행정노인통합지원센터', region: '김해시', role: '주담당' },
        
        // 문일지 담당 기관 (이미 10개 등록되어 있음)
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48250007', orgName: '김해돌봄지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48250004', orgName: '김해시종합사회복지관', region: '김해시', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48720001', orgName: '의령노인통합지원센터', region: '의령군', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48740001', orgName: '사회적협동조합 창녕지역지활센터', region: '창녕군', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48740002', orgName: '창녕군새누리노인종합센터', region: '창녕군', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48120004', orgName: '명진노인통합지원센터', region: '창원시 마산합포구', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48120006', orgName: '성로노인통합지원센터', region: '창원시 의창구', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48120012', orgName: '진해서부노인종합복지관', region: '창원시', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48730001', orgName: '대한노인회함안군지회', region: '함안군', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48730002', orgName: '함안군재가노인통합지원센터', region: '함안군', role: '주담당' },
        
        // 김수연 담당 기관 (기존 2개에서 확장)
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48740001', orgName: '사회적협동조합 창녕지역지활센터', region: '창녕군', role: '주담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48740002', orgName: '창녕군새누리노인종합센터', region: '창녕군', role: '주담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48250001', orgName: '효동원노인통합지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48250005', orgName: '생명의전화노인통합지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48250006', orgName: '보현행정노인통합지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48120008', orgName: '경남노인통합지원센터', region: '창원시', role: '주담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48120011', orgName: '창원사회적협동조합', region: '창원시', role: '주담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48120013', orgName: '진해노인종합복지관', region: '창원시', role: '주담당' },
        
        // 이정혜 담당 기관 (기존 2개에서 확장)
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48120004', orgName: '명진노인통합지원센터', region: '창원시 마산합포구', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48120006', orgName: '성로노인통합지원센터', region: '창원시 의창구', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48120001', orgName: '동진노인통합지원센터', region: '창원시 의창구', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48250007', orgName: '김해돌봄지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48250004', orgName: '김해시종합사회복지관', region: '김해시', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48120008', orgName: '경남노인통합지원센터', region: '창원시', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48120011', orgName: '창원사회적협동조합', region: '창원시', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48120013', orgName: '진해노인종합복지관', region: '창원시', role: '주담당' },
        
        // 이연숙 담당 기관 (기존 3개에서 확장)
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48120012', orgName: '진해서부노인종합복지관', region: '창원시', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48730001', orgName: '대한노인회함안군지회', region: '함안군', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48730002', orgName: '함안군재가노인통합지원센터', region: '함안군', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48120001', orgName: '동진노인통합지원센터', region: '창원시 의창구', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48250007', orgName: '김해돌봄지원센터', region: '김해시', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48250004', orgName: '김해시종합사회복지관', region: '김해시', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48720001', orgName: '의령노인통합지원센터', region: '의령군', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48120008', orgName: '경남노인통합지원센터', region: '창원시', role: '주담당' }
      ];
      
      return res.status(200).json({
        status: 'success',
        data: { matchings: testMatchings },
        source: 'test_data'
      });
    }

    // 헤더를 제외한 실제 데이터
    const headers = data[0];
    const rows = data.slice(1);
    console.log(`총 ${rows.length}개 위원-기관 매칭 데이터 로드됨`);

    // 매칭 데이터 변환
    const matchings = rows.map(row => {
      return {
        committeeId: row[0] || '',
        committeeName: row[1] || '',
        orgId: row[2] || '',
        orgCode: row[3] || '',
        orgName: row[4] || '',
        region: row[5] || '',
        role: row[6] || '', // '주담당' 또는 '부담당'
        checkType: row[7] || '전체' // '매월', '반기', '전체' 중 하나
      };
    });
    
    console.log('매칭 데이터 변환 완료. 첫 번째 데이터 샘플:', matchings.length > 0 ? matchings[0] : 'No data');

    return res.status(200).json({
      status: 'success',
      data: { matchings },
      source: 'sheet_data'
    });
  } catch (error) {
    console.error('위원-기관 매칭 정보 조회 중 오류:', error);
    
    // 클라이언트에 전송할 오류 메시지
    let errorMessage = '서버 오류가 발생했습니다.';
    
    // 세부 오류 정보 (개발 환경에서만 제공)
    if (process.env.NODE_ENV === 'development') {
      errorMessage += ` 세부 정보: ${error.message}`;
      console.error('스택 트레이스:', error.stack);
    }
    
    return res.status(500).json({
      status: 'error',
      message: errorMessage
    });
  }
};

// 위원-기관 매칭 정보 업데이트
const updateCommitteeMatching = async (req, res) => {
  try {
    // 개발 환경에서는 인증 체크 우회
    const bypassAuth = process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true';
    
    // 마스터 계정 확인
    if (!bypassAuth && (!req.session || !req.session.committee || req.session.committee.role !== 'master')) {
      return res.status(403).json({
        status: 'error',
        message: '마스터 관리자만 접근할 수 있습니다.'
      });
    }

    const { matchings } = req.body;

    if (!matchings || !Array.isArray(matchings) || matchings.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '유효한 매칭 정보가 필요합니다.'
      });
    }

    // 기존 시트 데이터 가져오기
    console.log('기존 위원-기관 매칭 정보 조회 중...');
    const sheetRange = '위원별_담당기관!A:H'; // 점검유형 컬럼 추가
    const existingData = await readSheetData(SPREADSHEET_ID, sheetRange);
    
    // 헤더 정보
    const headers = existingData && existingData.length > 0 
      ? existingData[0] 
      : ['committeeId', 'committeeName', 'orgId', 'orgCode', 'orgName', 'region', 'role', 'checkType'];

    // 새 매칭 정보 포맷팅
    const newRows = matchings.map(matching => [
      matching.committeeId || '',
      matching.committeeName || '',
      matching.orgId || '',
      matching.orgCode || '',
      matching.orgName || '',
      matching.region || '',
      matching.role || '', // '주담당' 또는 '부담당'
      matching.checkType || '전체' // '매월', '반기', '전체' 중 하나
    ]);

    // 시트에 쓰기
    console.log('위원-기관 매칭 정보 업데이트 중...');
    const dataToWrite = [headers, ...newRows];
    const updateRange = `위원별_담당기관!A1:H${dataToWrite.length}`;
    
    await writeSheetData(SPREADSHEET_ID, updateRange, dataToWrite);
    console.log('위원-기관 매칭 정보 업데이트 완료');
    
    return res.status(200).json({
      status: 'success',
      message: '위원-기관 매칭 정보가 성공적으로 업데이트되었습니다.',
      data: { matchings }
    });
  } catch (error) {
    console.error('위원-기관 매칭 정보 업데이트 중 오류:', error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

module.exports = {
  getAllCommittees,
  getCurrentCommittee,
  getAllCommitteesFromSheet,
  updateCommitteeMatching,
  getAllCommitteeMatchings
}; 