// 공통 유틸리티 함수

// 일정 데이터 변경 이벤트 처리를 위한 커스텀 이벤트
const SCHEDULE_UPDATED_EVENT = 'scheduleUpdated';

// 종합보고서 관련 데이터 제거
(function cleanupReportData() {
  // 종합보고서 관련 localStorage 항목 제거
  localStorage.removeItem('last_active_tab');
  localStorage.removeItem('calendar_from_report');
  
  console.log('종합보고서 관련 데이터가 정리되었습니다.');
})();

// 일정 변경 이벤트 리스너 등록 함수
function addScheduleUpdateListener(callback) {
  window.addEventListener(SCHEDULE_UPDATED_EVENT, function(event) {
    callback(event.detail.type, event.detail.data);
  });
}

// 일정 업데이트 알림 함수 (다른 모듈에서 사용)
function notifyScheduleUpdated(type, data) {
  // 이벤트를 발생시켜 다른 모듈에 알림
  const event = new CustomEvent('scheduleUpdated', {
    detail: {
      type: type,
      data: data
    }
  });
  
  window.dispatchEvent(event);
  document.dispatchEvent(event);
  
  console.log(`일정 ${type} 이벤트가 발생되었습니다:`, data);
  return true;
} 