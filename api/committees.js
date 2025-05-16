// 위원회 데이터 API 엔드포인트
const sheetsHelper = require('./sheets-helper');

module.exports = async (req, res) => {
  try {
    console.log('[api/committees] Request received');
    
    // 구글 시트에서 위원회 데이터 가져오기 시도
    let committeeData;
    
    try {
      console.log('[api/committees] Attempting to fetch data from Google Sheets');
      committeeData = await sheetsHelper.readSheetData('committees!A:C');
      console.log(`[api/committees] Successfully fetched ${committeeData.length - 1} committee records`);
    } catch (error) {
      console.error('[api/committees] Error fetching from Google Sheets:', error.message);
      
      // 오류 발생 시 fallback 데이터 사용
      console.log('[api/committees] Using fallback data');
      committeeData = sheetsHelper.getFallbackData('committees');
    }
    
    // 헤더 제거 및 객체 배열로 변환
    const headers = committeeData[0] || ['name', 'id', 'role'];
    const committees = committeeData.slice(1).map(row => {
      const committee = {};
      headers.forEach((header, index) => {
        committee[header.toLowerCase()] = row[index] || '';
      });
      return committee;
    });
    
    return res.status(200).json({
      status: 'success',
      data: committees,
      source: committeeData === sheetsHelper.getFallbackData('committees') ? 'fallback' : 'sheets'
    });
  } catch (error) {
    console.error('[api/committees] Unhandled error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: '위원회 데이터를 가져오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 