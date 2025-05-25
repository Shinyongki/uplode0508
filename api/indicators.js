// 지표 API 처리 모듈
const express = require('express');
const { google } = require('googleapis');
const sheetsHelper = require('./sheets-helper');
const cacheManager = require('./cache-manager');

// 캐시 키 설정
const CACHE_KEY_PREFIX = 'indicators';
const CACHE_TTL = 60 * 15; // 15분 캐시

// 지표 컬럼 매핑 (구글 시트 '지표_목록' 시트 기준)
const INDICATOR_COLUMNS = {
  ID: 'id',
  CODE: 'code',
  NAME: 'name',
  CATEGORY: 'category',
  REVIEW_MATERIALS: '점검자료',
  COMMON_REQUIRED: '공통필수',
  COMMON_OPTIONAL: '공통선택',
  EVALUATION_LINKED: '평가연계',
  ONLINE_CHECK: '온라인점검',
  ONSITE_CHECK: '현장점검',
  DESCRIPTION: 'description'
};

/**
 * 지표 API 핸들러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
async function handleIndicatorsRequest(req, res) {
  try {
    // 쿼리 파라미터 추출
    const period = req.query.period; // 매월, 반기, 1~3월 등
    const orgCode = req.query.orgCode; // 기관 코드

    // 필수 파라미터 확인
    if (!period || !orgCode) {
      return res.status(400).json({
        status: 'error',
        message: '필수 파라미터가 누락되었습니다. (period, orgCode)'
      });
    }

    console.log(`[API] 지표 요청: 주기=${period}, 기관코드=${orgCode}`);

    // 캐시 키 생성
    const cacheKey = `${CACHE_KEY_PREFIX}_${period}_${orgCode}`;

    // 캐시된 데이터 확인
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`[API] 캐시된 지표 데이터 반환: ${cacheKey}`);
      return res.status(200).json(cachedData);
    }

    // 구글 시트에서 지표 데이터 가져오기
    const indicators = await getIndicatorsFromSheet(period, orgCode);

    // 응답 데이터 구성
    const responseData = {
      status: 'success',
      data: {
        indicators: indicators,
        period: period,
        orgCode: orgCode,
        timestamp: new Date().toISOString()
      }
    };

    // 캐시에 저장
    cacheManager.set(cacheKey, responseData, CACHE_TTL);

    // 응답 반환
    res.status(200).json(responseData);
  } catch (error) {
    console.error('[API] 지표 데이터 조회 중 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '지표 데이터를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * 구글 시트에서 지표 데이터 가져오기
 * @param {string} period - 주기 (매월, 반기, 1~3월 등)
 * @param {string} orgCode - 기관 코드
 * @returns {Promise<Array>} 지표 목록
 */
async function getIndicatorsFromSheet(period, orgCode) {
  try {
    // 구글 시트 인증 클라이언트 가져오기
    const authClient = await sheetsHelper.getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // 스프레드시트 ID
    const spreadsheetId = process.env.SPREADSHEET_ID;
    
    // 시트 이름 설정 - '지표_목록' 시트 사용
    const sheetName = '지표_목록';
    
    // 범위 설정 (A:L은 A열부터 L열까지 모든 데이터)
    const range = `${sheetName}!A:L`;
    
    console.log(`[API] 구글 시트 조회: 시트=${sheetName}, 범위=${range}`);
    
    // 구글 시트 API 호출
    console.log(`[API] 구글 시트 API 호출 시도: spreadsheetId=${spreadsheetId}, range=${range}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    // 데이터 추출
    const rows = response.data.values || [];
    console.log(`[API] 구글 시트 응답 받음: ${rows.length}개 행 데이터`);
    if (rows.length > 0) {
      console.log('[API] 첫 번째 행 (헤더):', rows[0]);
      if (rows.length > 1) {
        console.log('[API] 두 번째 행 (첫 번째 데이터):', rows[1]);
      }
    }
    
    // 헤더 행 추출 (첫 번째 행)
    const headers = rows[0] || [];
    
    // 헤더 인덱스 매핑
    const headerIndexMap = {};
    headers.forEach((header, index) => {
      headerIndexMap[header] = index;
    });
    
    console.log('헤더 정보:', headers);
    console.log('헤더 인덱스 매핑:', headerIndexMap);
    
    // 필요한 열 인덱스 확인 (이미지에 보이는 실제 데이터 구조 반영)
    const idIndex = headerIndexMap['id'] || 0;
    const codeIndex = headerIndexMap['code'] || 1;
    const nameIndex = headerIndexMap['name'] || 2;
    const categoryIndex = headerIndexMap['category'] || 3;
    const reviewMaterialsIndex = headerIndexMap['점검자료'] || 4;
    const commonRequiredIndex = headerIndexMap['공통필수'] || 5;
    const commonOptionalIndex = headerIndexMap['공통선택'] || 6;
    const evaluationLinkedIndex = headerIndexMap['평가연계'] || 7;
    const onlineCheckIndex = headerIndexMap['온라인점검'] || 8;
    const onsiteCheckIndex = headerIndexMap['현장점검'] || 9;
    const descriptionIndex = headerIndexMap['description'] || 10;
    
    // 지표 데이터 변환
    const indicators = [];
    
    // 주기별 매핑 (카테고리 기준) - 연중 카테고리를 반기 탭에 포함
    const periodMapping = {
      '매월': ['매월'],
      '반기': ['반기', '연중'],  // 연중 카테고리를 반기 탭에 포함
      '1~3월': ['1~3월', '분기']
    };
    
    // 선택된 주기에 해당하는 카테고리 목록
    const targetCategories = periodMapping[period] || [period];
    
    // 첫 번째 행(헤더)을 제외하고 데이터 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // 빈 행 건너뛰기
      if (!row || row.length === 0) continue;
      
      // 지표 ID와 카테고리 확인
      const indicatorId = row[idIndex];
      const indicatorCode = row[codeIndex];
      const indicatorCategory = row[categoryIndex];
      
      // 카테고리가 선택된 주기와 일치하는 지표만 필터링
      if (targetCategories.includes(indicatorCategory)) {
        // 공통필수/공통선택 여부 확인
        const isCommonRequired = row[commonRequiredIndex] === 'O';
        const isCommonOptional = row[commonOptionalIndex] === 'O';
        
        // 평가연계 여부 확인
        const isEvaluationLinked = row[evaluationLinkedIndex] === 'O';
        
        // 점검 방법 확인
        const onlineCheck = row[onlineCheckIndex] || '';
        const onsiteCheck = row[onsiteCheckIndex] || '';
        
        // 점검 유형 결정
        let checkType = '';
        if (onlineCheck === '필수' || onlineCheck === '우선') {
          checkType = '온라인';
        } else if (onsiteCheck === '필수' || onsiteCheck === '우선') {
          checkType = '현장';
        }
        
        // 우선순위 결정
        let priority = '';
        if (onlineCheck === '필수' || onsiteCheck === '필수') {
          priority = '필수';
        } else if (onlineCheck === '우선' || onsiteCheck === '우선') {
          priority = '우선';
        } else if (onlineCheck === '선택' || onsiteCheck === '선택') {
          priority = '선택';
        }
        
        indicators.push({
          id: indicatorId,
          code: indicatorCode,
          name: row[nameIndex] || `지표 ${indicatorCode}`,
          category: indicatorCategory,
          reviewMaterials: row[reviewMaterialsIndex] || '',
          isCommonRequired,
          isCommonOptional,
          isEvaluationLinked,
          // 한글 필드명 추가 (클라이언트 호환성 유지)
          '공통필수': isCommonRequired ? 'O' : '',
          '공통선택': isCommonOptional ? 'O' : '',
          '평가연계': isEvaluationLinked ? 'O' : '',
          '검토자료': row[reviewMaterialsIndex] || '',
          commonRequired: isCommonRequired ? 'O' : '',
          commonOptional: isCommonOptional ? 'O' : '',
          evaluationLinked: isEvaluationLinked ? 'O' : '',
          onlineCheck,
          onsiteCheck,
          checkType,
          priority,
          description: row[descriptionIndex] || '',
          period: period // 현재 선택된 주기 정보 추가
        });
      }
    }
    
    console.log(`[API] 구글 시트에서 ${indicators.length}개 지표 데이터 추출 완료`);
    
    return indicators;
  } catch (error) {
    console.error('[API] 구글 시트에서 지표 데이터 가져오기 실패:', error);
    console.error('[API] 오류 상세 정보:', error.message);
    if (error.stack) {
      console.error('[API] 오류 스택:', error.stack);
    }
    if (error.response) {
      console.error('[API] 오류 응답 데이터:', error.response.data);
      console.error('[API] 오류 응답 상태:', error.response.status);
    }
    
    // 오류 발생 시 샘플 데이터 반환 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] 개발 환경에서 샘플 지표 데이터 반환');
      return getSampleIndicators(period);
    }
    
    throw error;
  }
}

/**
 * 샘플 지표 데이터 생성 (개발 및 테스트용)
 * @param {string} period - 주기 (매월, 반기, 1~3월 등)
 * @returns {Array} 샘플 지표 목록
 */
function getSampleIndicators(period) {
  // 주기별 지표 수
  const countMap = {
    '매월': 10,
    '반기': 5,
    '1~3월': 3
  };
  
  const count = countMap[period] || 5;
  const indicators = [];
  
  // 샘플 데이터 생성 (실제 데이터 구조 반영)
  const sampleData = [
    { id: 'I001', code: 'M001', name: '모인우리 수행기관 상세현황 현행화', category: '매월', reviewMaterials: '모인우리 수행기관 상세현황 정보', commonRequired: 'O', commonOptional: '', evaluationLinked: '', onlineCheck: '필수', onsiteCheck: '', description: '수행기관 상세현황 정보의 현행화 여부' },
    { id: 'I002', code: 'M002', name: '종사자 채용현황', category: '매월', reviewMaterials: '모인우리 배정 및 채용인원, 배정현황 변경 근거서류', commonRequired: 'O', commonOptional: '', evaluationLinked: 'O', onlineCheck: '필수', onsiteCheck: '', description: '종사자 채용 현황 점검' },
    { id: 'I003', code: 'M003', name: '종사자 근속현황', category: '매월', reviewMaterials: '모인우리 배정 및 채용인원', commonRequired: 'O', commonOptional: '', evaluationLinked: 'O', onlineCheck: '필수', onsiteCheck: '', description: '종사자 근속 현황 점검' },
    { id: 'I004', code: 'M004', name: '종사자 직무교육 이수율', category: '매월', reviewMaterials: 'LMS 시스템 DB, 모인우리 배정 및 채용인원', commonRequired: 'O', commonOptional: '', evaluationLinked: '', onlineCheck: '필수', onsiteCheck: '', description: '종사자 직무교육 이수율 점검' },
    { id: 'I005', code: 'M005', name: '종사자 역량강화교육 이수율', category: '매월', reviewMaterials: 'LMS 시스템 DB, 모인우리 배정 및 채용인원', commonRequired: 'O', commonOptional: '', evaluationLinked: '', onlineCheck: '필수', onsiteCheck: '', description: '종사자 역량강화교육 이수율 점검' },
    { id: 'I006', code: 'Y020', name: '(일반 및 중점) 선정조사일 준수', category: '매월', reviewMaterials: '노인맞춤돌봄시스템 DB', commonRequired: '', commonOptional: 'O', evaluationLinked: 'O', onlineCheck: '선택', onsiteCheck: '우선', description: '선정조사일 준수 점검' },
    { id: 'I016', code: 'H001', name: '(특화) 서비스 접수(의뢰) 및 선정조사 기한 준수', category: '반기', reviewMaterials: '(특화) 사업운영시스템 DB', commonRequired: '', commonOptional: 'O', evaluationLinked: 'O', onlineCheck: '선택', onsiteCheck: '우선', description: '서비스 접수 및 선정조사 기한 준수 점검' },
    { id: 'I061', code: 'Q001', name: '배상·상해보험 가입', category: '1~3월', reviewMaterials: '가입자 명단, 보험증권 등', commonRequired: '', commonOptional: 'O', evaluationLinked: '', onlineCheck: '우선', onsiteCheck: '선택', description: '배상·상해보험 가입 여부 확인' },
    { id: 'Y001', code: 'Y001', name: '연간 사업계획 수립 및 이행', category: '연중', reviewMaterials: '연간 사업계획서, 사업운영 현황', commonRequired: 'O', commonOptional: '', evaluationLinked: 'O', onlineCheck: '필수', onsiteCheck: '우선', description: '연간 사업계획이 적절히 수립되고 이행되고 있는지 확인' },
    { id: 'Y002', code: 'Y002', name: '연간 예산 집행 적절성', category: '연중', reviewMaterials: '예산집행 현황, 회계장부', commonRequired: 'O', commonOptional: '', evaluationLinked: 'O', onlineCheck: '필수', onsiteCheck: '우선', description: '연간 예산이 적절히 집행되고 있는지 확인' }
  ];
  
  // 주기별 필터링
  const periodMapping = {
    '매월': '매월',
    '반기': '반기',
    '1~3월': '1~3월'
  };
  
  // 샘플 데이터 확장 - 더 많은 지표 추가
  const additionalSampleData = [
    { id: 'I007', code: 'M007', name: '서비스 제공계획 수립 및 이행', category: '매월', reviewMaterials: '서비스 제공계획서, 사업운영시스템 DB', commonRequired: 'O', commonOptional: '', evaluationLinked: 'O', onlineCheck: '필수', onsiteCheck: '', description: '서비스 제공계획이 적절히 수립되고 이행되고 있는지 확인' },
    { id: 'I008', code: 'M008', name: '서비스 만족도 조사 실시', category: '매월', reviewMaterials: '서비스 만족도 조사지, 결과보고서', commonRequired: '', commonOptional: 'O', evaluationLinked: 'O', onlineCheck: '선택', onsiteCheck: '우선', description: '서비스 만족도 조사를 정기적으로 실시하고 결과를 반영하는지 확인' },
    { id: 'I009', code: 'M009', name: '사례관리 회의 실시', category: '매월', reviewMaterials: '사례관리 회의록, 회의 자료', commonRequired: 'O', commonOptional: '', evaluationLinked: '', onlineCheck: '필수', onsiteCheck: '', description: '사례관리 회의가 정기적으로 실시되고 있는지 확인' },
    { id: 'I010', code: 'H002', name: '(특화) 서비스 제공 적절성', category: '반기', reviewMaterials: '(특화) 사업운영시스템 DB, 서비스 제공 기록', commonRequired: '', commonOptional: 'O', evaluationLinked: 'O', onlineCheck: '선택', onsiteCheck: '우선', description: '특화 서비스가 적절히 제공되고 있는지 확인' },
    { id: 'I011', code: 'H003', name: '기관 연계 및 지역사회 자원 활용', category: '반기', reviewMaterials: '연계 현황, MOU 계약서, 자원 활용 기록', commonRequired: 'O', commonOptional: '', evaluationLinked: 'O', onlineCheck: '선택', onsiteCheck: '필수', description: '지역사회 자원을 활용하고 기관 연계를 활성화하고 있는지 확인' },
    { id: 'I062', code: 'Q002', name: '시설관리 상태 점검', category: '1~3월', reviewMaterials: '시설 안전점검 기록, 화재예방점검 기록', commonRequired: 'O', commonOptional: '', evaluationLinked: '', onlineCheck: '선택', onsiteCheck: '필수', description: '시설이 안전하게 관리되고 있는지 확인' },
    { id: 'I063', code: 'Q003', name: '재무회계 관리 적절성', category: '1~3월', reviewMaterials: '회계장부, 예산집행 기록', commonRequired: 'O', commonOptional: '', evaluationLinked: 'O', onlineCheck: '우선', onsiteCheck: '선택', description: '재무회계가 투명하고 적절하게 관리되고 있는지 확인' }
  ];
  
  // 기존 샘플 데이터와 추가 데이터 합치기
  const allSampleData = [...sampleData, ...additionalSampleData];
  
  // 주기별 필터링
  const filteredData = allSampleData.filter(item => item.category === periodMapping[period]);
  
  // 필터링된 데이터가 없으면 주기에 맞는 샘플 데이터 생성
  if (filteredData.length === 0) {
    // 주기별 샘플 데이터 정의
    const monthlyIndicators = [
      { id: 'I101', code: 'M101', name: '서비스 제공 적절성', reviewMaterials: '서비스 제공 기록, 사업운영시스템 DB', isEvaluationLinked: true, isCommonRequired: true, description: '서비스가 적절히 제공되고 있는지 확인' },
      { id: 'I102', code: 'M102', name: '사례관리 회의 실시 여부', reviewMaterials: '사례관리 회의록, 회의 자료', isEvaluationLinked: false, isCommonRequired: true, description: '사례관리 회의가 정기적으로 실시되고 있는지 확인' },
      { id: 'I103', code: 'M103', name: '서비스 만족도 조사', reviewMaterials: '서비스 만족도 조사지, 결과보고서', isEvaluationLinked: true, isCommonRequired: false, description: '서비스 만족도 조사 실시 및 결과 반영 확인' }
    ];
    
    const semiAnnualIndicators = [
      { id: 'I201', code: 'H201', name: '지역사회 자원 활용 현황', reviewMaterials: '자원 활용 현황, 연계 현황', isEvaluationLinked: true, isCommonRequired: true, description: '지역사회 자원을 적절히 활용하고 있는지 확인' },
      { id: 'I202', code: 'H202', name: '종사자 역량 강화 현황', reviewMaterials: '교육 이수 현황, 역량강화 프로그램', isEvaluationLinked: false, isCommonRequired: true, description: '종사자 역량 강화를 위한 노력이 적절히 이루어지고 있는지 확인' }
    ];
    
    const quarterlyIndicators = [
      { id: 'I301', code: 'Q301', name: '시설 안전 관리 상태', reviewMaterials: '시설 안전 점검 기록, 화재 예방 점검 기록', isEvaluationLinked: false, isCommonRequired: true, description: '시설이 안전하게 관리되고 있는지 확인' },
      { id: 'I302', code: 'Q302', name: '재무회계 관리 적절성', reviewMaterials: '회계장부, 예산집행 기록', isEvaluationLinked: true, isCommonRequired: true, description: '재무회계가 투명하고 적절하게 관리되고 있는지 확인' }
    ];
    
    // 주기에 맞는 샘플 데이터 선택
    let selectedIndicators = [];
    if (period === '매월') {
      selectedIndicators = monthlyIndicators;
    } else if (period === '반기') {
      selectedIndicators = semiAnnualIndicators;
    } else if (period === '1~3월') {
      selectedIndicators = quarterlyIndicators;
    }
    
    // 샘플 데이터 추가
    for (const indicator of selectedIndicators) {
      indicators.push({
        id: indicator.id,
        code: indicator.code,
        name: indicator.name,
        category: period,
        reviewMaterials: indicator.reviewMaterials,
        isEvaluationLinked: indicator.isEvaluationLinked,
        isCommonRequired: indicator.isCommonRequired,
        evaluationLinked: indicator.isEvaluationLinked ? 'O' : '',
        commonRequired: indicator.isCommonRequired ? 'O' : '',
        '평가연계': indicator.isEvaluationLinked ? 'O' : '',
        '공통필수': indicator.isCommonRequired ? 'O' : '',
        '검토자료': indicator.reviewMaterials,
        description: indicator.description
      });
    }
  } else {
    // 이미지에서 본 샘플 데이터 활용
    filteredData.forEach((item, index) => {
      const isPrimary = index % 3 === 0;
      const isSecondary = index % 3 === 1;
      const isTertiary = index % 3 === 2;
      const isRequired = index % 2 === 0;
      
      indicators.push({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        reviewMaterials: item.reviewMaterials || '',
        isCommonRequired: item.commonRequired === 'O',
        isCommonOptional: item.commonOptional === 'O',
        isEvaluationLinked: item.evaluationLinked === 'O',
        // 한글 필드명 추가 (클라이언트 호환성 유지)
        '공통필수': item.commonRequired,
        '공통선택': item.commonOptional,
        '평가연계': item.evaluationLinked,
        commonRequired: item.commonRequired,
        commonOptional: item.commonOptional,
        evaluationLinked: item.evaluationLinked,
        onlineCheck: item.onlineCheck || '',
        onsiteCheck: item.onsiteCheck || '',
        checkType: item.onlineCheck ? '온라인' : (item.onsiteCheck ? '현장' : ''),
        priority: (item.onlineCheck === '필수' || item.onsiteCheck === '필수') ? '필수' : 
                 (item.onlineCheck === '우선' || item.onsiteCheck === '우선') ? '우선' : '선택',
        description: item.description || `${item.name}에 대한 상세 설명입니다.`,
        period: period
      });
    });
  }
  
  return indicators;
}

module.exports = handleIndicatorsRequest;
