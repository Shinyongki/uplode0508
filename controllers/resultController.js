// const resultModel = require('../models/result');

// 모델 가져오기
const resultModel = require('../models/result');

// 모니터링 결과 저장
const saveMonitoringResult = async (req, res) => {
  try {
    // 세션에서 위원 정보 가져오기
    if (!req.session || !req.session.committee) {
      return res.status(401).json({
        status: 'error',
        message: '로그인이 필요합니다.'
      });
    }
    
    const committeeName = req.session.committee.name;
    const resultData = req.body;
    
    console.log('수신된 결과 데이터:', JSON.stringify(resultData));
    
    // 필수 필드 검증
    if (!resultData.기관코드 || !resultData.지표ID || !resultData.결과) {
      return res.status(400).json({
        status: 'error',
        message: '기관코드, 지표ID, 결과는 필수 항목입니다.'
      });
    }
    
    // category와 지역 필드 확인 및 추가
    if (!resultData.hasOwnProperty('category')) {
      console.log('category 필드가 없음, 빈 값으로 추가');
      resultData.category = '';
    }
    
    if (!resultData.hasOwnProperty('지역')) {
      console.log('지역 필드가 없음, 빈 값으로 추가');
      resultData.지역 = '';
    }
    
    // 위원 이름 자동 추가
    resultData.위원명 = committeeName;
    // 평가일자가 없는 경우 현재 날짜로 설정
    if (!resultData.평가일자) {
      resultData.평가일자 = new Date().toISOString().split('T')[0];
    }

    // 수정 요청인 경우 (update, overwrite 또는 isUpdate 플래그 체크)
    const isUpdate = resultData.update === true || 
                    resultData.overwrite === true || 
                    resultData.isUpdate === true;
    
    console.log(`${isUpdate ? '수정' : '저장'} 요청으로 처리 - 같은 월/지표 데이터 ${isUpdate ? '덮어쓰기' : '추가'}`);
    
    // 저장할 최종 데이터에 수정 여부 플래그 추가
    resultData.isUpdate = isUpdate;
    console.log('저장할 최종 데이터:', JSON.stringify(resultData));
    
    // 구글 시트에 데이터 저장
    const result = await resultModel.saveMonitoringResult(resultData);
    
    // 프론트엔드에 수정 모드였는지 여부를 응답에 포함
    return res.status(200).json({
      status: 'success',
      message: `모니터링 결과가 성공적으로 ${isUpdate ? '수정' : '저장'}되었습니다.`,
      data: { 
        result,
        wasUpdate: isUpdate 
      }
    });
  } catch (error) {
    console.error('모니터링 결과 저장 중 오류 발생:', error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 특정 기관의 모니터링 결과 가져오기
const getResultsByOrganization = async (req, res) => {
  try {
    const { orgCode } = req.params;
    
    if (!orgCode) {
      return res.status(400).json({
        status: 'error',
        message: '기관 코드가 필요합니다.'
      });
    }
    
    console.log(`기관(${orgCode}) 결과 API 요청`);
    
    // 구글 시트에서 결과 가져오기
    const results = await resultModel.getResultsByOrganization(orgCode);
    
    // 결과 데이터 검증 및 필드 확인
    if (results && results.length > 0) {
      console.log(`기관(${orgCode}) 결과 ${results.length}개 확인`);
      
      // 모든 결과에 category와 지역 필드가 있는지 확인하고 없으면 추가
      results.forEach(result => {
        if (!result.hasOwnProperty('category')) {
          result.category = '';
        }
        
        if (!result.hasOwnProperty('지역')) {
          result.지역 = '';
        }
      });
    } else {
      console.log(`기관(${orgCode})에 대한 결과 없음`);
    }
    
    return res.status(200).json({
      status: 'success',
      data: { results }
    });
  } catch (error) {
    console.error(`기관 모니터링 결과 조회 중 오류 발생 (코드: ${req.params.orgCode}):`, error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 내 모니터링 결과 가져오기
const getMyResults = async (req, res) => {
  try {
    // 세션에서 위원 정보 가져오기
    if (!req.session || !req.session.committee) {
      return res.status(401).json({
        status: 'error',
        message: '로그인이 필요합니다.'
      });
    }
    
    const committeeName = req.session.committee.name;
    console.log(`위원(${committeeName}) 결과 API 요청`);
    
    // 구글 시트에서 결과 가져오기
    const results = await resultModel.getResultsByCommittee(committeeName);
    
    // 결과 데이터 검증 및 필드 확인
    if (results && results.length > 0) {
      console.log(`위원(${committeeName}) 결과 ${results.length}개 확인`);
      
      // 모든 결과에 category와 지역 필드가 있는지 확인하고 없으면 추가
      results.forEach(result => {
        if (!result.hasOwnProperty('category')) {
          result.category = '';
        }
        
        if (!result.hasOwnProperty('지역')) {
          result.지역 = '';
        }
      });
    } else {
      console.log(`위원(${committeeName})에 대한 결과 없음`);
    }
    
    return res.status(200).json({
      status: 'success',
      data: { results }
    });
  } catch (error) {
    console.error('내 모니터링 결과 조회 중 오류 발생:', error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 특정 기관과 지표에 대한 모니터링 결과 가져오기
const getResultByOrgAndIndicator = async (req, res) => {
  try {
    const { orgCode, indicatorId } = req.params;
    
    if (!orgCode || !indicatorId) {
      return res.status(400).json({
        status: 'error',
        message: '기관 코드와 지표 ID가 필요합니다.'
      });
    }
    
    console.log(`기관(${orgCode})의 지표(${indicatorId}) 결과 API 요청`);
    
    // 구글 시트에서 결과 가져오기
    const result = await resultModel.getResultByOrgAndIndicator(orgCode, indicatorId);
    
    // 결과 데이터 검증 및 필드 확인
    if (result) {
      console.log(`기관(${orgCode})의 지표(${indicatorId}) 결과 확인:`, result);
      
      // category와 지역 필드가 있는지 확인하고 없으면 추가
      if (!result.hasOwnProperty('category')) {
        result.category = '';
      }
      
      if (!result.hasOwnProperty('지역')) {
        result.지역 = '';
      }
    } else {
      console.log(`기관(${orgCode})의 지표(${indicatorId})에 대한 결과 없음`);
    }
    
    return res.status(200).json({
      status: 'success',
      data: { result }
    });
  } catch (error) {
    console.error(`기관(${req.params.orgCode})의 지표(${req.params.indicatorId}) 결과 조회 중 오류 발생:`, error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 중복 데이터 정리 (관리자 전용)
const cleanupDuplicateResults = async (req, res) => {
  try {
    // 세션에서 위원 정보 가져오기 및 관리자 권한 확인
    if (!req.session || !req.session.committee) {
      return res.status(401).json({
        status: 'error',
        message: '로그인이 필요합니다.'
      });
    }
    
    // 관리자 권한 확인 (필요에 따라 추가 로직 구현)
    const isAdmin = req.session.committee.isAdmin === true;
    if (!isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: '관리자만 이 기능을 사용할 수 있습니다.'
      });
    }
    
    console.log('중복 데이터 정리 작업 요청');
    
    // 중복 데이터 정리 실행
    const cleanupResult = await resultModel.cleanupDuplicateData();
    
    return res.status(200).json({
      status: 'success',
      message: cleanupResult.message,
      data: { 
        cleanupResult
      }
    });
  } catch (error) {
    console.error('중복 데이터 정리 중 오류 발생:', error);
    return res.status(500).json({
      status: 'error',
      message: '서버 오류가 발생했습니다.'
    });
  }
};

module.exports = {
  saveMonitoringResult,
  getResultsByOrganization,
  getMyResults,
  getResultByOrgAndIndicator,
  cleanupDuplicateResults
}; 