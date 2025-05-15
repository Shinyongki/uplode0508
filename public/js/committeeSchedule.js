// 마스터 로그인 시 각 담당자별 기관방문일정 관리를 위한 JS 파일

console.log('[DEBUG] committeeSchedule.js 파일 로드 시작');

// 전역 변수들 정의
let allCommitteeSchedules = []; // 모든 위원 일정
let filteredSchedules = []; // 현재 월에 필터링된 일정
let selectedMonth = new Date().getMonth(); // 현재 월 (0-11)
let selectedYear = new Date().getFullYear(); // 현재 연도

// 위원별 색상 기본 정의 (calendar.js와 동일한 색상 사용)
const COMMITTEE_COLORS = {
  '신용기': '#3366FF', // 파란색
  '김수연': '#FF3366', // 분홍색
  '문일지': '#FFCC00', // 노란색
  '이연숙': '#33CC66', // 녹색
  '이정혜': '#9933CC'  // 보라색
};

// 위원 번호에 따라 실제 이름으로 매핑하는 객체
const committeeNameMapping = {
  '모니터링위원1': '신용기',
  '모니터링위원2': '김수연',
  '모니터링위원3': '문일지',
  '모니터링위원4': '이연숙',
  '모니터링위원5': '이정혜'
};

// 위원 이름 정렬 우선순위 설정 (표시 순서)
const committeeOrder = [
  '신용기', '김수연', '문일지', '이연숙', '이정혜', '미지정'
];

// 동적 색상 배열 (위원 이름에 매핑된 색상이 없을 때 사용)
const colorPalette = [
  '#3366FF', // 파란색
  '#FF3366', // 분홍색
  '#FFCC00', // 노란색
  '#33CC66', // 녹색
  '#9933CC', // 보라색
  '#FF9933', // 주황색
  '#00CCCC', // 청록색
  '#6633FF', // 남색
  '#CC3300', // 적갈색
  '#669900'  // 올리브색
];

// 동적으로 할당된 색상 저장
const dynamicColors = {};

// 기본 색상
const defaultColor = '#757575'; // 회색

// 위원별 색상 매핑 생성 함수
function generateColorMapping() {
  const colorMapping = {};
  
  // 기본 이름 매핑
  Object.keys(COMMITTEE_COLORS).forEach(name => {
    colorMapping[name] = COMMITTEE_COLORS[name];
    // 모니터링위원 형식 매핑 추가
    Object.entries(committeeNameMapping).forEach(([key, value]) => {
      if (value === name) {
        colorMapping[key] = COMMITTEE_COLORS[name];
      }
    });
  });
  
  return colorMapping;
}

// 위원별 색상 매핑 추가
const committeeColors = generateColorMapping();

// 위원 이름을 실제 이름으로 변환하는 함수
function mapCommitteeName(originalName) {
  if (!originalName) return '미지정';
  
  // 직접 매핑된 이름이 있는 경우
  if (committeeNameMapping[originalName]) {
    return committeeNameMapping[originalName];
  }
  
  // '모니터링위원N' 패턴 확인
  if (originalName.startsWith('모니터링위원')) {
    // 숫자 부분 추출 (예: '모니터링위원1' -> '1')
    const numMatch = originalName.match(/모니터링위원(\d+)/);
    if (numMatch && numMatch[1]) {
      const committeeNum = parseInt(numMatch[1], 10);
      const mappedName = committeeNameMapping[`모니터링위원${committeeNum}`];
      if (mappedName) {
        return mappedName;
      }
    }
  }
  
  // 패턴이 맞지 않으면 원래 이름 반환
  return originalName;
}

// 위원 이름으로 색상 가져오기
function getCommitteeColor(committeeName) {
  if (!committeeName || committeeName === '미지정') return defaultColor;
  
  // 문자열로 변환
  const nameStr = String(committeeName);
  
  // 이미 매핑된 색상이 있으면 반환
  if (committeeColors[nameStr]) {
    return committeeColors[nameStr];
  }
  
  // 위원 이름 변환을 시도하여 매핑 검색
  const mappedName = mapCommitteeName(nameStr);
  if (mappedName !== nameStr && committeeColors[mappedName]) {
    return committeeColors[mappedName];
  }
  
  // 이름 포함 여부 확인 (부분 매칭)
  for (const [key, value] of Object.entries(COMMITTEE_COLORS)) {
    if (nameStr.includes(key) || key.includes(nameStr)) {
      return value;
    }
  }
  
  // 이미 동적으로 할당된 색상이 있으면 반환
  if (dynamicColors[nameStr]) {
    return dynamicColors[nameStr];
  }
  
  // 새로운 위원 이름에는 색상 팔레트에서 동적으로 색상 할당
  const colorIndex = Object.keys(dynamicColors).length % colorPalette.length;
  dynamicColors[nameStr] = colorPalette[colorIndex];
  
  return dynamicColors[nameStr];
}

// 위원 정렬 함수 추가
function sortCommitteeNames(a, b) {
  const indexA = committeeOrder.indexOf(a);
  const indexB = committeeOrder.indexOf(b);
  
  // 둘 다 우선순위 목록에 있는 경우
  if (indexA !== -1 && indexB !== -1) {
    return indexA - indexB;
  }
  
  // a만 우선순위 목록에 있는 경우
  if (indexA !== -1) {
    return -1;
  }
  
  // b만 우선순위 목록에 있는 경우
  if (indexB !== -1) {
    return 1;
  }
  
  // 둘 다 우선순위 목록에 없는 경우 알파벳 순서로 정렬
  return a.localeCompare(b);
}

// 실제 로그인 화면인지 확인하는 함수
function isLoginScreen() {
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  
  // 로그인 컨테이너가 표시되고 대시보드가 숨겨져 있으면 로그인 화면으로 간주
  return loginContainer && 
         window.getComputedStyle(loginContainer).display !== 'none' && 
         (!dashboardContainer || dashboardContainer.classList.contains('hidden'));
}

// 함수 즉시 등록 - 스크립트 로드 즉시 실행
window.initializeCommitteeSchedulesView = function() {
  console.log('[DEBUG] 원본 일정 초기화 함수 호출됨');
  
  // 로그인 화면에서는 실행하지 않음
  if (isLoginScreen()) {
    console.log('[DEBUG] 로그인 화면이 감지되어 일정 초기화를 건너뜁니다.');
    return;
  }
  
  // 마스터 대시보드에 일정 뷰 컨테이너 추가
  const masterDashboard = document.getElementById('master-dashboard');
  if (!masterDashboard) {
    console.warn('마스터 대시보드 엘리먼트를 찾을 수 없습니다');
    return;
  }
  
  // 이미 있으면 제거
  const existingContainer = document.getElementById('committee-schedules-section');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // 새로운 섹션 추가
  const schedulesSection = document.createElement('div');
  schedulesSection.id = 'committee-schedules-section';
  schedulesSection.className = 'bg-white p-6 rounded-lg shadow-sm mb-6';
  schedulesSection.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">담당자별 기관 방문 일정</h2>
      <div class="flex items-center space-x-2">
        <button id="prev-month-btn" class="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <span id="current-month-display" class="text-sm font-medium">${selectedYear}년 ${selectedMonth + 1}월</span>
        <button id="next-month-btn" class="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <a href="/calendar" class="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
          일정 관리
        </a>
      </div>
    </div>
    <div id="committee-schedules-container" class="mt-4">
      <div class="flex justify-center items-center p-8">
        <div class="loader"></div>
        <p class="ml-2">일정 데이터를 불러오는 중...</p>
      </div>
    </div>
  `;
  
  // 마스터 대시보드 상단에 삽입
  masterDashboard.insertBefore(schedulesSection, masterDashboard.firstChild);
  
  // 이벤트 리스너 추가
  document.getElementById('prev-month-btn').addEventListener('click', function() {
    if (typeof window.changeMonth === 'function') {
      window.changeMonth(-1);
    } else {
      console.error('changeMonth 함수를 찾을 수 없습니다');
    }
  });
  
  document.getElementById('next-month-btn').addEventListener('click', function() {
    if (typeof window.changeMonth === 'function') {
      window.changeMonth(1);
    } else {
      console.error('changeMonth 함수를 찾을 수 없습니다');
    }
  });
  
  // 일정 데이터 로드
  if (typeof window.loadCommitteeSchedules === 'function') {
    window.loadCommitteeSchedules();
  } else {
    console.error('loadCommitteeSchedules 함수를 찾을 수 없습니다');
  }
};

// 월 변경 함수 정의
window.changeMonth = function(delta) {
  console.log('[DEBUG] 월 변경 함수 호출됨, delta:', delta);
  
  // 로그인 화면에서는 실행하지 않음
  if (isLoginScreen()) {
    console.log('[DEBUG] 로그인 화면이 감지되어 월 변경을 건너뜁니다.');
    return;
  }
  
  // 월 업데이트
  let newMonth = selectedMonth + delta;
  let newYear = selectedYear;
  
  if (newMonth < 0) {
    newMonth = 11;
    newYear -= 1;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear += 1;
  }
  
  // 상태 업데이트
  selectedMonth = newMonth;
  selectedYear = newYear;
  
  // 표시 업데이트
  const monthDisplay = document.getElementById('current-month-display');
  if (monthDisplay) {
    monthDisplay.textContent = `${selectedYear}년 ${selectedMonth + 1}월`;
  }
  
  // 데이터 필터링 및 렌더링
  filterSchedulesByMonth(selectedMonth, selectedYear);
  renderCommitteeSchedules();
};

// 일정 데이터 로드 함수 정의
window.loadCommitteeSchedules = async function() {
  console.log('[DEBUG] 일정 데이터 로드 함수 호출됨');
  
  // 로그인 화면에서는 실행하지 않음
  if (isLoginScreen()) {
    console.log('[DEBUG] 로그인 화면이 감지되어 일정 데이터 로드를 건너뜁니다.');
    return;
  }
  
  try {
    const scheduleContainer = document.getElementById('committee-schedules-container');
    if (!scheduleContainer) {
      console.error('일정 컨테이너를 찾을 수 없습니다');
      return;
    }
    
    // 로딩 표시
    scheduleContainer.innerHTML = `
      <div class="flex justify-center items-center p-8">
        <div class="loader"></div>
        <p class="ml-2">일정 데이터를 불러오는 중...</p>
      </div>
    `;
    
    // API 호출
    const headers = getAuthHeaders();
    const timestamp = new Date().getTime();
    
    // 서버에서 일정 데이터 가져오기
    const response = await fetch(`/api/schedules?_t=${timestamp}`, {
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`일정 데이터 로드 실패: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.data && Array.isArray(data.data.schedules)) {
      // 전역 변수에 데이터 저장
      allCommitteeSchedules = data.data.schedules
        .filter(schedule => {
          // '관리자', '관리장 위원' 제외
          const committeeName = schedule.committeeName || '';
          return !committeeName.includes('관리자') && committeeName !== '관리장 위원';
        })
        .map(schedule => {
          // 위원 이름 매핑 적용
          if (schedule.committeeName) {
            schedule.originalCommitteeName = schedule.committeeName;
            schedule.committeeName = mapCommitteeName(schedule.committeeName);
          }
          return schedule;
        });
      
      console.log(`[DEBUG] 로드된 일정 데이터: ${allCommitteeSchedules.length}개 (관리자 제외)`);
      
      // 현재 월 필터링
      filterSchedulesByMonth(selectedMonth, selectedYear);
      
      // 일정 렌더링
      renderCommitteeSchedules();
    } else {
      console.error('일정 데이터가 올바른 형식이 아님:', data);
      scheduleContainer.innerHTML = `
        <div class="text-center p-4 text-gray-500">
          일정 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.
        </div>
      `;
    }
  } catch (error) {
    console.error('일정 데이터 로드 중 오류:', error);
    const scheduleContainer = document.getElementById('committee-schedules-container');
    if (scheduleContainer) {
      scheduleContainer.innerHTML = `
        <div class="text-center p-4 text-gray-500">
          오류가 발생했습니다: ${error.message || '알 수 없는 오류'}
        </div>
      `;
    }
  }
};

// 월별로 일정 필터링
const filterSchedulesByMonth = (month, year) => {
  selectedMonth = month;
  selectedYear = year;
  
  filteredSchedules = allCommitteeSchedules.filter(schedule => {
    const scheduleDate = new Date(schedule.date || schedule.visitDate);
    return scheduleDate.getMonth() === month && scheduleDate.getFullYear() === year;
  });
  
  // 위원 기준으로 그룹화
  const groupedSchedules = {};
  
  filteredSchedules.forEach(schedule => {
    const committeeName = schedule.committeeName || '미지정';
    if (!groupedSchedules[committeeName]) {
      groupedSchedules[committeeName] = [];
    }
    groupedSchedules[committeeName].push(schedule);
  });
  
  // 정렬된 위원 목록을 전역 변수에 저장
  window.committeeGroups = groupedSchedules;
  
  return groupedSchedules;
};

// 일정 목록 렌더링
const renderCommitteeSchedules = () => {
  const scheduleContainer = document.getElementById('committee-schedules-container');
  if (!scheduleContainer) return;
  
  // 위원별로 그룹화된 일정 가져오기
  const groupedSchedules = window.committeeGroups || {};
  
  // 표시할 위원이 있는지 확인
  const committeeCount = Object.keys(groupedSchedules).length;
  
  if (committeeCount === 0) {
    scheduleContainer.innerHTML = `
      <div class="bg-blue-50 p-4 rounded-lg text-center">
        <p class="text-blue-600">${selectedYear}년 ${selectedMonth + 1}월에 예정된 일정이 없습니다.</p>
      </div>
    `;
    return;
  }
  
  // 부담당자 정보 로드
  let coCommitteeData = {};
  try {
    // 매칭 데이터를 확인 (window.allMatchings에서 가져오기)
    if (window.allMatchings && Array.isArray(window.allMatchings)) {
      // 기관 코드별 담당자 정보 구성
      window.allMatchings.forEach(match => {
        if (!coCommitteeData[match.orgCode]) {
          coCommitteeData[match.orgCode] = {
            주담당: [],
            부담당: []
          };
        }
        
        if (match.role === '주담당') {
          coCommitteeData[match.orgCode].주담당.push(match.committeeName);
        } else if (match.role === '부담당') {
          coCommitteeData[match.orgCode].부담당.push(match.committeeName);
        }
      });
    } else {
      console.log('매칭 데이터를 찾을 수 없습니다. 부담당자 정보를 표시할 수 없습니다.');
    }
  } catch (err) {
    console.error('부담당자 데이터 로드 중 오류:', err);
  }
  
  // 위원별 일정 목록 생성
  let schedulesHTML = '';
  
  // 위원 이름을 정렬 우선순위에 따라 정렬
  Object.keys(groupedSchedules).sort(sortCommitteeNames).forEach(committeeName => {
    const committeeSchedules = groupedSchedules[committeeName];
    
    // 위원 색상 가져오기
    const committeeColor = getCommitteeColor(committeeName);
    
    schedulesHTML += `
      <div class="bg-white p-4 rounded-lg shadow-sm mb-4" style="border-top: 4px solid ${committeeColor};">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-medium" style="color: ${committeeColor};">
            <span style="border-left: 3px solid ${committeeColor}; padding-left: 8px;">
              ${committeeName} 위원
            </span>
          </h3>
          <span class="text-sm text-gray-500">총 ${committeeSchedules.length}건의 일정</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead style="background-color: ${committeeColor}10">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">방문일</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기관명</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">부담당자</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">메모</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    // 각 위원의 일정을 날짜순으로 정렬
    committeeSchedules.sort((a, b) => {
      const dateA = new Date(a.date || a.visitDate);
      const dateB = new Date(b.date || b.visitDate);
      return dateA - dateB;
    }).forEach(schedule => {
      const scheduleDate = new Date(schedule.date || schedule.visitDate);
      const formattedDate = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}-${String(scheduleDate.getDate()).padStart(2, '0')}`;
      
      // 시작/종료 시간 형식화
      const startTime = schedule.startTime || '미지정';
      const endTime = schedule.endTime || '미지정';
      const timeDisplay = startTime === '미지정' ? '미지정' : `${startTime} ~ ${endTime}`;
      
      // 일정 상태에 따른 스타일 설정
      let statusClass = 'bg-gray-100 text-gray-600';
      let statusText = '예정';
      
      if (schedule.status === 'completed') {
        statusClass = 'bg-green-100 text-green-800';
        statusText = '완료';
      } else if (schedule.status === 'canceled') {
        statusClass = 'bg-red-100 text-red-800';
        statusText = '취소';
      } else if (new Date(formattedDate) < new Date()) {
        // 지난 날짜인데 상태가 업데이트되지 않은 경우
        statusClass = 'bg-yellow-100 text-yellow-800';
        statusText = '미확인';
      }
      
      // 부담당자 정보 생성
      const orgCode = schedule.orgCode;
      let coCommitteeDisplay = '-';
      
      if (coCommitteeData[orgCode] && coCommitteeData[orgCode].부담당.length > 0) {
        coCommitteeDisplay = `
          <span class="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-medium">
            ${coCommitteeData[orgCode].부담당.join(', ')}
          </span>
        `;
      }
      
      // 날짜 클릭 이벤트를 위한 데이터 속성 추가
      schedulesHTML += `
          <tr class="hover:bg-gray-50 cursor-pointer" onclick="goToCalendarView('${formattedDate}')" style="background-color: ${committeeColor}05;">
            <td class="px-4 py-2 whitespace-nowrap text-sm text-blue-600 underline">${formattedDate}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">${timeDisplay}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
              <span style="border-left: 3px solid ${committeeColor}; padding-left: 6px; border-radius: 2px;">
                ${schedule.organizationName || schedule.orgName || '미지정'}
              </span>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">
              <span class="px-2 py-1 rounded text-xs font-medium" 
                    style="background-color: ${committeeColor}20; 
                          color: ${committeeColor}; 
                          border: 1px solid ${committeeColor}40;">
                ${schedule.committeeName || '미지정'}
              </span>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">
              ${coCommitteeDisplay}
            </td>
            <td class="px-4 py-2 whitespace-nowrap">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                ${statusText}
              </span>
            </td>
            <td class="px-4 py-2 text-sm text-gray-900">${schedule.notes || schedule.memo || '-'}</td>
          </tr>
      `;
    });
    
    schedulesHTML += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });
  
  // 컨테이너에 HTML 삽입
  scheduleContainer.innerHTML = schedulesHTML;
  
  // 날짜 클릭 시 달력뷰로 이동하는 함수 추가
  window.goToCalendarView = (dateString) => {
    // 날짜 저장
    localStorage.setItem('calendar_target_date', dateString);
    localStorage.setItem('calendar_from_report', 'true');
    
    // 달력 페이지로 이동
    window.location.href = '/calendar';
  };
};

// 달력뷰에서 일정 변경 이벤트 발생 시 재로드하는 이벤트 리스너 추가
document.addEventListener('masterDashboardDataUpdated', (event) => {
  console.log('마스터 대시보드 데이터 업데이트 감지, 일정 다시 로드');
  
  // 이벤트에 세부 정보가 있는 경우 로컬 데이터 즉시 업데이트
  if (event.detail && event.detail.type && event.detail.data) {
    const updateType = event.detail.type;
    const scheduleData = event.detail.data;
    
    console.log(`일정 이벤트 유형: ${updateType}, 데이터:`, scheduleData);
    
    // 이벤트 유형에 따라 처리
    if (updateType === 'delete') {
      console.log(`ID가 ${scheduleData.id}인 일정 삭제 처리`);
      
      // 로컬 데이터에서 해당 일정 삭제
      allCommitteeSchedules = allCommitteeSchedules.filter(schedule => 
        schedule.id !== scheduleData.id
      );
      
      // 필터링된 일정도 업데이트
      filterSchedulesByMonth(selectedMonth, selectedYear);
      
      // UI 즉시 업데이트
      renderCommitteeSchedules();
    }
  }
});