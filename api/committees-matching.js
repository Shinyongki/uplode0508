// 위원회-기관 매칭 정보 API 엔드포인트
const sheetsHelper = require('./sheets-helper');
const cacheManager = require('./cache-manager');
const dataSync = require('./data-sync');

// 정적 fallback 데이터
const STATIC_FALLBACK_MATCHINGS = [
  { 
    committeeId: 'C001', 
    committeeName: '신용기',
    orgCode: 'A48120001',
    orgName: '동진노인종합복지센터',
    role: 'main'
  },
  { 
    committeeId: 'C001', 
    committeeName: '신용기',
    orgCode: 'A48120002',
    orgName: '창원도우누리노인복지센터',
    role: 'main'
  },
  { 
    committeeId: 'C003', 
    committeeName: '김수연',
    orgCode: 'A48120001',
    orgName: '동진노인종합복지센터',
    role: 'sub'
  },
  { 
    committeeId: 'C004', 
    committeeName: '이연숙',
    orgCode: 'A48120001',
    orgName: '동진노인종합복지센터',
    role: 'sub'
  },
  { 
    committeeId: 'C003', 
    committeeName: '김수연',
    orgCode: 'A48120002',
    orgName: '창원도우누리노인복지센터',
    role: 'sub'
  },
  { 
    committeeId: 'C002', 
    committeeName: '문일지',
    orgCode: 'A48120003',
    orgName: '마산시니어클럽',
    role: 'main'
  },
  { 
    committeeId: 'C001', 
    committeeName: '신용기',
    orgCode: 'A48120003',
    orgName: '마산시니어클럽',
    role: 'sub'
  },
  { 
    committeeId: 'C003', 
    committeeName: '김수연',
    orgCode: 'A48120004',
    orgName: '김해시니어클럽',
    role: 'main'
  },
  { 
    committeeId: 'C005', 
    committeeName: '이정혜',
    orgCode: 'A48120004',
    orgName: '김해시니어클럽',
    role: 'sub'
  },
  { 
    committeeId: 'C005', 
    committeeName: '이정혜',
    orgCode: 'A48120005',
    orgName: '생명의전화노인복지센터',
    role: 'main'
  },
  { 
    committeeId: 'C002', 
    committeeName: '문일지',
    orgCode: 'A48120005',
    orgName: '생명의전화노인복지센터',
    role: 'sub'
  },
  { 
    committeeId: 'C004', 
    committeeName: '이연숙',
    orgCode: 'A48120006',
    orgName: '보현행정노인복지센터',
    role: 'main'
  },
  { 
    committeeId: 'C005', 
    committeeName: '이정혜',
    orgCode: 'A48120006',
    orgName: '보현행정노인복지센터',
    role: 'sub'
  }
];

module.exports = async (req, res) => {
  try {
    console.log('[api/committees-matching] Request received');
    
    // 1. 데이터 가져오기 시도: 계층적 fallback 적용
    let matchingData = null;
    let dataSource = 'unknown';
    let lastSyncTime = null;
    
    // 1.1 캐시에서 가져오기 시도
    console.log('[api/committees-matching] Attempting to use cached data');
    const cachedData = cacheManager.get('committee_matchings');
    
    if (cachedData) {
      matchingData = cachedData.data;
      lastSyncTime = cachedData.timestamp.created;
      dataSource = 'cache';
      console.log(`[api/committees-matching] Using cached data from ${new Date(lastSyncTime).toISOString()}`);
    } else {
      // 1.2 Google Sheets에서 연동이 있을 경우 구현할 위치
      // 현재는 fallback 데이터를 바로 사용
      console.log('[api/committees-matching] No cached data available, using static fallback data');
      matchingData = STATIC_FALLBACK_MATCHINGS;
      dataSource = 'static-fallback';
      
      // 캐시에 저장 (24시간 유효)
      cacheManager.set('committee_matchings', matchingData, 24 * 60 * 60 * 1000);
    }
    
    // 데이터가 없는 경우 최종 fallback으로 정적 데이터 사용
    if (!matchingData || matchingData.length === 0) {
      console.log('[api/committees-matching] No data available, using static fallback as last resort');
      matchingData = STATIC_FALLBACK_MATCHINGS;
      dataSource = 'static-fallback';
    }
    
    // 2. 응답 반환
    return res.status(200).json({
      status: 'success',
      data: matchingData,
      meta: {
        source: dataSource,
        count: matchingData.length,
        lastSync: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
        usingFallback: dataSource !== 'sheets'
      }
    });
  } catch (error) {
    console.error('[api/committees-matching] Unhandled error:', error.message);
    console.error(error.stack);
    
    // 오류가 발생해도 클라이언트에 기본 데이터는 제공
    return res.status(200).json({
      status: 'success',
      data: STATIC_FALLBACK_MATCHINGS,
      meta: {
        source: 'error-fallback',
        error: error.message,
        usingFallback: true
      }
    });
  }
}; 