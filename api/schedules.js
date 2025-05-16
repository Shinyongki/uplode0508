// 일정 데이터 API 엔드포인트
const sheetsHelper = require('./sheets-helper');

// 정적 fallback 데이터 (당일 +/- 7일 범위의 임시 일정)
const FALLBACK_SCHEDULES = generateFallbackSchedules();

function generateFallbackSchedules() {
  const schedules = [];
  const today = new Date();
  const committees = ['신용기', '문일지', '김수연', '이연숙', '이정혜'];
  const organizations = [
    '동진노인종합복지센터', 
    '창원도우누리노인복지센터', 
    '마산시니어클럽', 
    '김해시니어클럽', 
    '생명의전화노인복지센터', 
    '보현행정노인복지센터'
  ];
  
  // 오늘 날짜에서 -7일부터 +7일까지의 일정 생성
  for (let i = -7; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // 주말은 건너뛰기
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // 각 날짜마다 1-3개의 랜덤 일정 생성
    const scheduleCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < scheduleCount; j++) {
      const committeeIndex = Math.floor(Math.random() * committees.length);
      const orgIndex = Math.floor(Math.random() * organizations.length);
      
      schedules.push({
        id: `sched-${date.getTime()}-${j}`,
        date: formatDate(date),
        committeeName: committees[committeeIndex],
        organizationName: organizations[orgIndex],
        title: '정기 모니터링',
        status: '예정'
      });
    }
  }
  
  return schedules;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

module.exports = async (req, res) => {
  try {
    console.log('[api/schedules] Request received');
    
    // 구글 시트에서 일정 데이터 가져오기 시도
    let schedulesData;
    
    try {
      console.log('[api/schedules] Attempting to fetch data from Google Sheets');
      schedulesData = await sheetsHelper.readSheetData('schedules!A:F');
      console.log(`[api/schedules] Successfully fetched ${schedulesData.length - 1} schedule records`);
      
      // 헤더 제거 및 객체 배열로 변환
      const headers = schedulesData[0] || ['id', 'date', 'committeeName', 'organizationName', 'title', 'status'];
      const schedules = schedulesData.slice(1).map(row => {
        return {
          id: row[0] || `sched-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          date: row[1] || formatDate(new Date()),
          committeeName: row[2] || '',
          organizationName: row[3] || '',
          title: row[4] || '정기 모니터링',
          status: row[5] || '예정'
        };
      });
      
      return res.status(200).json({
        status: 'success',
        data: schedules,
        source: 'sheets'
      });
    } catch (error) {
      console.error('[api/schedules] Error fetching from Google Sheets:', error.message);
      console.error(error.stack);
      
      // 오류 발생 시 fallback 데이터 사용
      console.log('[api/schedules] Using fallback data');
      
      return res.status(200).json({
        status: 'success',
        data: FALLBACK_SCHEDULES,
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('[api/schedules] Unhandled error:', error.message);
    console.error(error.stack);
    
    return res.status(500).json({
      status: 'error',
      message: '일정 데이터를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 