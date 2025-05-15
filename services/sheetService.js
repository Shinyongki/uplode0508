const { google } = require('googleapis');
const { getAuthClient } = require('../config/googleSheets');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 기관 목록 가져오기
const getOrganizations = async () => {
  try {
    console.log('기관 목록 조회 시작');
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '기관_목록!A:E', // id, code, name, region, address
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('기관 목록이 비어있습니다.');
      return [];
    }

    // 헤더 제거
    const headers = rows[0];
    const data = rows.slice(1);

    // 기관 데이터 변환
    const organizations = data.map(row => ({
      id: row[0],
      code: row[1],
      name: row[2],
      region: row[3],
      address: row[4]
    }));

    console.log(`기관 목록 조회 완료: ${organizations.length}개 기관`);
    return organizations;
  } catch (error) {
    console.error('기관 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 위원의 담당 기관 목록 가져오기
const getCommitteeOrganizations = async (committeeName) => {
  try {
    // 마스터 계정인 경우 전체 기관 목록 반환
    if (committeeName === '마스터' || committeeName.toLowerCase() === 'master') {
      const allOrgs = await getOrganizations();
      return {
        mainOrgs: allOrgs,
        subOrgs: []
      };
    }

    console.log(`${committeeName} 위원의 담당 기관 조회 시작`);
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '위원별_담당기관!A:G', // 위원명, 기관코드, 기관명, 지역, 담당유형 등
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('위원별 담당 기관 데이터가 비어있습니다.');
      return { mainOrgs: [], subOrgs: [] };
    }

    // 헤더 제거
    const headers = rows[0];
    const data = rows.slice(1);

    // 해당 위원의 담당 기관 찾기
    const committeeRows = data.filter(row => row[1] === committeeName);
    console.log(`${committeeName} 위원 관련 데이터 ${committeeRows.length}개 찾음`);

    // 주담당 기관과 부담당 기관 분리
    const mainOrgs = committeeRows
      .filter(row => row[6] === '주담당')
      .map(row => ({
        id: row[2],
        code: row[3],
        name: row[4],
        region: row[5]
      }));

    const subOrgs = committeeRows
      .filter(row => row[6] === '부담당')
      .map(row => ({
        id: row[2],
        code: row[3],
        name: row[4],
        region: row[5]
      }));

    console.log(`${committeeName} 위원 담당 기관 조회 완료: 주담당 ${mainOrgs.length}개, 부담당 ${subOrgs.length}개`);
    return { mainOrgs, subOrgs };
  } catch (error) {
    console.error('위원 담당 기관 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

// 위원 목록 가져오기
const getCommittees = async () => {
  try {
    console.log('위원 목록 조회 시작');
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'committees!A:C', // 위원ID, 위원명, 역할
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('위원 목록이 비어있습니다.');
      return [];
    }

    // 헤더 제거
    const headers = rows[0];
    const data = rows.slice(1);

    // 위원 데이터 변환
    const committees = data.map(row => ({
      id: `C${row[0]}`,
      name: row[1],
      role: row[2] || 'monitor'
    }));

    console.log(`위원 목록 조회 완료: ${committees.length}명`);
    return committees;
  } catch (error) {
    console.error('위원 목록 조회 중 오류 발생:', error);
    throw error;
  }
};

module.exports = {
  getOrganizations,
  getCommitteeOrganizations,
  getCommittees
}; 