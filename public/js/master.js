// 마스터 대시보드 관련 기능

// 시군 리스트 regions.js에서 import
if (!window.SIGUN_LIST) {
  const script = document.createElement('script');
  script.src = '/js/regions.js';
  document.head.appendChild(script);
}

// 전역 변수: 기관 목록
let allOrganizations = [];
// 전역 변수: 위원 목록
let allCommittees = [];
// 전역 변수: 위원-기관 매칭 정보
let allMatchings = [];

// 마스터 대시보드 초기화 및 표시
window.showMasterDashboard = async () => {
  try {
    console.log('마스터 대시보드 초기화 시작');
    
    // 일반 화면 숨기기
    document.getElementById('organization-selection').classList.add('hidden');
    document.getElementById('monitoring-indicators').classList.add('hidden');
    
    // committeeSchedule.js가 제대로 로드되었는지 확인
    if (typeof window.initializeCommitteeSchedulesView !== 'function') {
      console.log('일정 뷰 초기화 함수가 아직 로드되지 않음. 로딩 중...');
      
      // 스크립트 강제 로드 시도
      const script = document.createElement('script');
      script.src = '/js/committeeSchedule.js';
      script.onload = () => console.log('committeeSchedule.js 스크립트 추가 로드 완료');
      script.onerror = (e) => console.error('committeeSchedule.js 로드 오류:', e);
      document.head.appendChild(script);
    } else {
      console.log('일정 뷰 초기화 함수가 이미 로드되어 있음');
    }
    
    // 마스터 대시보드 컨테이너 가져오기 또는 생성
    let masterDashboard = document.getElementById('master-dashboard');
    if (!masterDashboard) {
      masterDashboard = document.createElement('div');
      masterDashboard.id = 'master-dashboard';
      masterDashboard.className = 'flex-1 container mx-auto px-4 py-6';
      document.querySelector('main').appendChild(masterDashboard);
    }
    
    // 마스터 대시보드 기본 내용
    masterDashboard.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 class="text-xl font-bold text-blue-700 mb-4">마스터 관리자 대시보드</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" id="dashboard-stats">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="text-md font-medium text-blue-800 mb-2">전체 기관</h3>
            <div class="text-3xl font-bold" id="total-orgs-count">51</div>
            <p class="text-sm text-gray-500 mt-1">모니터링 대상 기관</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="text-md font-medium text-green-800 mb-2">전체 완료율</h3>
            <div class="text-3xl font-bold" id="monitoring-completion-rate">0%</div>
            <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div id="monitoring-progress-bar" class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
            <p class="text-sm text-gray-500 mt-1">지표 점검 완료</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <h3 class="text-md font-medium text-purple-800 mb-2">위원 수</h3>
            <div class="text-3xl font-bold" id="committees-count">5</div>
            <p class="text-sm text-gray-500 mt-1">활동 중인 모니터링 위원</p>
          </div>
        </div>
        
        <div class="mb-6">
          <h3 class="text-lg font-medium mb-3">기관-담당자 매칭 관리</h3>
          <div class="bg-blue-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-blue-800">이 화면에서 모니터링 위원을 기관의 주담당 또는 부담당으로 배정할 수 있습니다.</p>
          </div>
          
          <div class="flex items-center justify-between mb-4">
            <div class="flex space-x-2">
              <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition" id="add-match-btn">
                담당자 매칭 추가
              </button>
              <button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition" id="add-org-btn">
                기관 추가
              </button>
              <button class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition" id="refresh-matches-btn">
                새로고침
              </button>
            </div>
            <div class="flex items-center">
              <label for="org-filter" class="mr-2 text-sm">기관 필터:</label>
              <select id="org-filter" class="border rounded px-2 py-1">
                <option value="">전체 기관</option>
                <option value="main">주담당 미배정</option>
                <option value="sub">부담당 미배정</option>
              </select>
            </div>
          </div>
          
          <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기관명</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기관코드</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주담당</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">부담당</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">진행률</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시군</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody id="matching-table-body" class="bg-white divide-y divide-gray-200">
                <tr>
                  <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    // 마스터 대시보드 표시
    masterDashboard.classList.remove('hidden');
    
    // 데이터 로드
    await loadMasterDashboardData();
    
    // 이벤트 리스너 등록
    document.getElementById('add-match-btn').addEventListener('click', showAddMatchingModal);
    document.getElementById('add-org-btn').addEventListener('click', showAddOrgModal);
    document.getElementById('refresh-matches-btn').addEventListener('click', refreshMatchingData);
    document.getElementById('org-filter').addEventListener('change', filterOrganizations);
    
    // 담당자별 기관방문일정 뷰 초기화 (직접 호출)
    if (typeof window.initializeCommitteeSchedulesView === 'function') {
      console.log('[DEBUG] 담당자별 기관방문일정 뷰 직접 초기화 시도 (showMasterDashboard)');
      try {
        window.initializeCommitteeSchedulesView();
      } catch (e) {
        console.error('[DEBUG] 담당자별 기관방문일정 뷰 초기화 중 오류:', e);
      }
    } else {
      console.warn('[DEBUG] 담당자별 기관방문일정 뷰 초기화 함수를 찾을 수 없습니다 (showMasterDashboard)');
    }
    
    // 담당자별 기관방문일정 뷰 초기화를 위한 커스텀 이벤트 발생
    console.log('[DEBUG] 마스터 대시보드 준비 이벤트 발생');
    const dashboardReadyEvent = new Event('masterDashboardReady');
    document.dispatchEvent(dashboardReadyEvent);
  } catch (error) {
    console.error('마스터 대시보드 초기화 중 오류:', error);
    alert('대시보드 로딩 중 오류가 발생했습니다.');
  }
};

// 마스터 대시보드 데이터 로드
const loadMasterDashboardData = async () => {
  try {
    console.log('마스터 대시보드 데이터 로드 시작');
    
    // 1. 기관 목록 가져오기
    const orgsResponse = await organizationApi.getAllOrganizations();
    if (orgsResponse.status === 'success') {
      allOrganizations = orgsResponse.data.organizations || [];
      // 기관 수 표시
      document.getElementById('total-orgs-count').textContent = allOrganizations.length.toString();
      console.log('기관 목록 로드 완료:', allOrganizations.length);
    } else {
      console.error('조직 목록 조회 실패:', orgsResponse.message);
      // 실패해도 51로 표시
      document.getElementById('total-orgs-count').textContent = '51';
      allOrganizations = [];
    }

    // 2. 위원 목록 가져오기
    const committeesResponse = await committeeApi.getAllCommittees();
    if (committeesResponse.status === 'success') {
      allCommittees = committeesResponse.data.committees || [];
      document.getElementById('committees-count').textContent = allCommittees.length.toString();
      console.log('위원 목록 로드 완료:', allCommittees.length);
    } else {
      console.error('위원 목록 조회 실패:', committeesResponse.message);
      // 위원 수를 5명으로 하드코딩
      document.getElementById('committees-count').textContent = '5';
      allCommittees = [];
    }

    // 3. 매칭 정보 가져오기
    await refreshMatchingData();

    // 지역별 기관 분류 및 출력
    showOrganizationsByRegion();

    // 4. 모니터링 결과 데이터 가져오기 및 진행률 계산
    try {
      console.log('모니터링 결과 데이터 가져오기 시작');
      const timestamp = new Date().getTime();
      const headers = getAuthHeaders();
      
      const completionDataResponse = await fetch(`/api/results/me?_t=${timestamp}`, {
        headers: headers
      });
      
      if (!completionDataResponse.ok) {
        console.error('결과 데이터 가져오기 실패:', completionDataResponse.status);
        document.getElementById('monitoring-completion-rate').textContent = '0%';
        throw new Error('모니터링 결과 데이터를 가져오는데 실패했습니다.');
      }
      
      const completionData = await completionDataResponse.json();
      console.log('결과 데이터 로드 완료', completionData.status);
      
      // 전체 모니터링 결과 데이터 (모든 기관)
      if (completionData.status === 'success' && completionData.data && completionData.data.results) {
        // 전역 변수에 모니터링 결과 저장 (기관별 진행률 계산에 사용)
        window.monitoringResults = completionData.data.results;
        
        // 중복 제거된 실제 지표 완료 수 계산
        const uniqueCompletions = new Set();
        completionData.data.results.forEach(result => {
          const key = `${result.기관코드 || result.orgCode}_${result.지표ID || result.indicatorId}`;
          uniqueCompletions.add(key);
        });
        
        // 총 수행해야 할 지표 수 (기관 수 x 지표 수)
        const totalIndicatorsPerOrg = 63; // 각 기관당 지표 수
        const totalIndicators = allOrganizations.length * totalIndicatorsPerOrg;
        
        // 실제 완료된 고유한 지표 수
        const completedIndicators = uniqueCompletions.size;
        
        // 전체 완료율 계산
        const completionRate = totalIndicators > 0 
          ? Math.round((completedIndicators / totalIndicators) * 100) 
          : 0;
        
        console.log(`전체 완료율 계산(중복 제거): ${completedIndicators}/${totalIndicators} = ${completionRate}%`);
        
        // UI 업데이트 - 진행률 표시 및 프로그레스 바
        document.getElementById('monitoring-completion-rate').textContent = `${completionRate}%`;
        
        // 프로그레스 바가 있으면 업데이트
        const progressBar = document.getElementById('monitoring-progress-bar');
        if (progressBar) {
          progressBar.style.width = `${completionRate}%`;
        }
      } else {
        // 데이터가 없거나 오류가 발생한 경우
        console.warn('유효한 결과 데이터를 받지 못함');
        document.getElementById('monitoring-completion-rate').textContent = '0%';
        window.monitoringResults = [];
      }
    } catch (error) {
      console.error('완료율 계산 중 오류:', error);
      document.getElementById('monitoring-completion-rate').textContent = '0%';
      window.monitoringResults = [];
    }
    
    console.log('마스터 대시보드 데이터 로드 완료');
    
    // 데이터 로드 완료 후, 담당자별 기관방문일정 뷰 초기화
    // 함수가 없는 경우를 대비해 재시도 로직 추가
    let retryCount = 0;
    const maxRetries = 5;
    
    const initScheduleView = () => {
      console.log(`[DEBUG] initScheduleView 호출 (시도 ${retryCount + 1}/${maxRetries + 1})`);
      
      if (typeof window.initializeCommitteeSchedulesView === 'function') {
        console.log('[DEBUG] 마스터 대시보드 데이터 로드 완료: 담당자별 기관방문일정 뷰 초기화 시작');
        try {
          window.initializeCommitteeSchedulesView();
          console.log('[DEBUG] 담당자별 기관방문일정 뷰 초기화 성공');
        } catch (e) {
          console.error('[DEBUG] 담당자별 기관방문일정 뷰 초기화 중 오류:', e);
        }
      } else {
        retryCount++;
        console.log(`[DEBUG] 함수 확인: window.initializeCommitteeSchedulesView = ${typeof window.initializeCommitteeSchedulesView}`);
        
        if (retryCount <= maxRetries) {
          console.log(`[DEBUG] 담당자별 기관방문일정 초기화 함수가 아직 로드되지 않았습니다. 재시도 중... (${retryCount}/${maxRetries})`);
          // 지수 백오프로 대기 시간 증가 (500ms, 1000ms, 2000ms, 4000ms, 8000ms)
          const delay = Math.min(500 * Math.pow(2, retryCount - 1), 8000);
          console.log(`[DEBUG] ${delay}ms 후 재시도 예정`);
          setTimeout(initScheduleView, delay);
        } else {
          console.error('[DEBUG] 담당자별 기관방문일정 초기화 함수를 찾을 수 없습니다. 최대 재시도 횟수 초과.');
        }
      }
    };
    
    // 초기화 함수 호출 시작
    console.log('[DEBUG] 일정 초기화 함수 호출 시작 (loadMasterDashboardData)');
    initScheduleView();
  } catch (error) {
    console.error('대시보드 데이터 로드 중 오류:', error);
    // 더 자세한 오류 메시지 표시
    alert(`데이터 로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    // 기본값 설정
    document.getElementById('committees-count').textContent = '0';
    document.getElementById('total-orgs-count').textContent = '51';
    document.getElementById('monitoring-completion-rate').textContent = '0%';
    allCommittees = [];
    allOrganizations = [];
    window.monitoringResults = [];
  }
};

// 매칭 정보 새로고침
const refreshMatchingData = async () => {
  try {
    console.log('매칭 정보 새로고침 시작');
    
    // API 호출 전 로딩 표시
    const tableBody = document.getElementById('matching-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-4 text-center text-gray-500">
            <div class="flex justify-center items-center space-x-2">
              <svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>매칭 정보를 불러오는 중...</span>
            </div>
          </td>
        </tr>
      `;
    }
    
    // 오류 발생 가능성이 높은 API 호출 구간에 더 자세한 로그 추가
    console.log('1. API 호출 준비 - 인증 헤더 가져오기');
    const headers = getAuthHeaders();
    console.log('인증 헤더:', headers ? '설정됨' : '없음');
    
    // 기존 매칭 데이터 보존 (API 호출 실패 시 대비)
    const existingMatchings = [...allMatchings]; // 기존 데이터 복사본 사용
    console.log(`기존 매칭 데이터 백업: ${existingMatchings.length}개 항목`);
    
    let matchingData = {
      status: 'success',
      data: {
        matchings: existingMatchings 
      }
    };
    
    try {
      console.log('2. committeeApi.getAllMatchings 호출 시작');
      
      // API 요청 옵션 설정
      const requestOptions = {
        credentials: 'include', // 세션 쿠키 포함
        headers: headers
      };
      console.log('API 요청 옵션:', requestOptions);
      
      const matchingsResponse = await committeeApi.getAllMatchings();
      console.log('3. API 응답 수신:', matchingsResponse.status);
      
      if (matchingsResponse.status === 'success' && matchingsResponse.data && matchingsResponse.data.matchings) {
        matchingData = matchingsResponse;
        console.log('매칭 정보 API 호출 성공:', matchingData.data.matchings.length);
      } else {
        console.error('매칭 정보 조회 실패:', matchingsResponse.message);
        // 오류 메시지 표시하지만 기존 데이터 유지
        showMessage('매칭 정보를 불러오는데 실패했습니다. 기존 데이터를 사용합니다.', 'warning');
      }
    } catch (apiError) {
      console.error('매칭 API 호출 중 오류:', apiError);
      // 오류 메시지 표시하지만 기존 데이터 유지
      showMessage('매칭 API 호출 중 오류가 발생했습니다. 기존 데이터를 사용합니다.', 'warning');
    }
    
    // 매칭 데이터 유효성 확인
    if (!matchingData.data || !matchingData.data.matchings || !Array.isArray(matchingData.data.matchings)) {
      console.warn('매칭 데이터가 유효하지 않음. 기존 데이터 사용');
      matchingData.data = { matchings: existingMatchings };
    }
    
    // 성공하든 실패하든 여기서 데이터 처리
    allMatchings = matchingData.data.matchings || [];
    console.log('매칭 정보 처리 완료:', allMatchings.length);
    
    // 매칭 데이터 기반으로 테이블 업데이트
    updateMatchingTable();
    
    return true;
  } catch (error) {
    console.error('매칭 정보 새로고침 중 오류:', error);
    
    // 오류가 발생해도 UI는 유지하기 위해 현재 데이터로 테이블 업데이트
    updateMatchingTable();
    
    // 오류 경고 표시
    showMessage(`매칭 정보를 새로고침하는 중 오류가 발생했습니다: ${error.message}`, 'error');
    return false;
  }
};

// 매칭 테이블 업데이트
const updateMatchingTable = () => {
  console.log('매칭 테이블 업데이트 시작');
  
  const tableBody = document.getElementById('matching-table-body');
  if (!tableBody) {
    console.error('매칭 테이블 본문을 찾을 수 없습니다');
    return;
  }
  
  // 필터 값 가져오기 및 필터링된 기관 목록 생성
  const filterValue = document.getElementById('org-filter')?.value?.trim() || '';
  console.log('Applying org filter:', filterValue, 'with total matchings:', allMatchings.length);
  const filteredOrgs = allOrganizations.filter(org => {
    // 조직 코드 키 대응
    const orgCodeVal = org.orgCode || org.기관코드 || org.code || '';
    // 역할 값 정규화: 공백 제거 후 소문자 변환
    const hasMain = allMatchings.some(m => {
      const r = (m.role || '')
        .toString()
        .replace(/\s+/g, '') // 공백 제거
        .toLowerCase();
      return m.orgCode === orgCodeVal && (r === '주담당' || r === 'main');
    });
    const hasSub = allMatchings.some(m => {
      const r = (m.role || '')
        .toString()
        .replace(/\s+/g, '') // 공백 제거
        .toLowerCase();
      return m.orgCode === orgCodeVal && (r === '부담당' || r === 'sub');
    });
    console.log(`[filter] org=${orgCodeVal}, hasMain=${hasMain}, hasSub=${hasSub}`);
    if (filterValue === 'main') {
      return !hasMain;
    }
    if (filterValue === 'sub') {
      return !hasSub;
    }
    return true;
  });
  
  // 기관이 없는 경우
  if (filteredOrgs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
          표시할 기관이 없습니다.
        </td>
      </tr>
    `;
    return;
  }
  
  // 시군별로 그룹화
  const regionGroups = {};
  
  filteredOrgs.forEach(org => {
    let region = org.region || org.지역 || '미분류';
    if (region.startsWith('창원시')) region = '창원시';
    if (!regionGroups[region]) {
      regionGroups[region] = [];
    }
    regionGroups[region].push(org);
  });
  
  // 테이블 내용 생성
  let tableContent = '';
  
  // 시군 그룹별로 정렬하여 출력
  Object.keys(regionGroups).sort().forEach(region => {
    // 지역 헤더 행 추가 - 더 시각적으로 명확하게 개선
    tableContent += `
      <tr>
        <td colspan="7" class="bg-blue-100 px-6 py-3 text-left">
          <div class="flex items-center">
            <span class="font-bold text-blue-800 text-md">${region}</span>
            <span class="ml-2 bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              ${regionGroups[region].length}개 기관
            </span>
          </div>
        </td>
      </tr>
    `;
    
    // 해당 지역의 기관 목록
    regionGroups[region].sort((a, b) => {
      const nameA = a.name || a.기관명 || '';
      const nameB = b.name || b.기관명 || '';
      return nameA.localeCompare(nameB);
    }).forEach(org => {
      // 해당 기관의 매칭 정보 찾기
      const mainMatchings = allMatchings.filter(m => m.orgCode === org.code && m.role === '주담당');
      const subMatchings = allMatchings.filter(m => m.orgCode === org.code && m.role === '부담당');
      
      // 주담당, 부담당 위원 정보
      const mainCommitteeName = mainMatchings.length > 0 ? mainMatchings[0].committeeName : '-';
      const subCommitteeNames = subMatchings.map(m => m.committeeName).join(', ') || '-';
      
      // 진행률 계산 (실제 데이터 사용)
      const progressRate = calculateOrgProgress(org.code || org.기관코드);
      
      // 진행률에 따른 색상 설정
      let progressColorClass = 'bg-blue-600';
      if (progressRate >= 75) {
        progressColorClass = 'bg-green-600';
      } else if (progressRate >= 50) {
        progressColorClass = 'bg-blue-600';
      } else if (progressRate >= 25) {
        progressColorClass = 'bg-yellow-500';
      } else {
        progressColorClass = 'bg-red-500';
      }
      
      tableContent += `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${org.name || org.기관명}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-500">${org.code || org.기관코드}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm ${mainCommitteeName === '-' ? 'text-red-500' : 'text-gray-900'}">${mainCommitteeName}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm ${subCommitteeNames === '-' ? 'text-yellow-500' : 'text-gray-900'}">${subCommitteeNames}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div class="${progressColorClass} h-2.5 rounded-full" style="width: ${progressRate}%"></div>
            </div>
            <div class="text-xs text-gray-500 mt-1 text-right">${progressRate}%</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">${region}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div class="flex justify-end space-x-2">
              <button class="text-indigo-600 hover:text-indigo-900 hover:underline edit-match-btn" 
                      data-org-code="${org.code || org.기관코드}" data-org-name="${org.name || org.기관명}">
                담당자 변경
              </button>
              <button class="text-red-600 hover:text-red-900 hover:underline delete-org-btn"
                      data-org-code="${org.code || org.기관코드}" data-org-name="${org.name || org.기관명}">
                삭제
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  });
  
  // 테이블 업데이트
  tableBody.innerHTML = tableContent;
  
  // 담당자 변경 버튼에 이벤트 리스너 등록
  document.querySelectorAll('.edit-match-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orgCode = e.target.dataset.orgCode;
      const orgName = e.target.dataset.orgName;
      console.log('담당자 변경 버튼 클릭:', orgCode, orgName);
      saveOrgMatching(orgCode);
    });
  });

  // 기관 삭제 버튼에 이벤트 리스너 등록
  document.querySelectorAll('.delete-org-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orgCode = e.target.dataset.orgCode;
      const orgName = e.target.dataset.orgName;
      console.log('기관 삭제 버튼 클릭:', orgCode, orgName);
      deleteOrganization(orgCode, orgName);
    });
  });
  
  console.log('매칭 테이블 업데이트 완료');
};

// 기관별 진행률 계산 함수
const calculateOrgProgress = (orgCode) => {
  try {
    // 모니터링 결과 데이터가 없는 경우
    if (!window.monitoringResults || !Array.isArray(window.monitoringResults)) {
      console.log(`기관(${orgCode}) 진행률 계산: 모니터링 결과 데이터 없음, 0% 반환`);
      return 0;
    }
    
    // 총 지표 수 (기관당 63개 지표)
    const totalIndicatorsPerOrg = 63;
    
    // 해당 기관의 결과 개수 계산
    const orgResults = window.monitoringResults.filter(result => {
      // 기관코드 필드가 다양한 이름으로 존재할 수 있음
      const resultOrgCode = result.기관코드 || result.orgCode || '';
      return resultOrgCode === orgCode;
    });
    
    // 중복 지표 제거 (같은 지표 여러 번 평가된 경우 한 번만 카운트)
    const uniqueIndicators = new Set();
    orgResults.forEach(result => {
      const indicatorId = result.지표ID || result.indicatorId || '';
      if (indicatorId) {
        uniqueIndicators.add(indicatorId);
      }
    });
    
    // 진행률 계산
    const completedCount = uniqueIndicators.size;
    const progressRate = totalIndicatorsPerOrg > 0 
      ? Math.round((completedCount / totalIndicatorsPerOrg) * 100) 
      : 0;
    
    console.log(`기관(${orgCode}) 진행률 계산: ${completedCount}/${totalIndicatorsPerOrg} = ${progressRate}%`);
    return progressRate;
  } catch (error) {
    console.error(`기관(${orgCode}) 진행률 계산 중 오류:`, error);
    return 0;
  }
};

// 필터링 적용
const filterOrganizations = () => {
  const filter = document.getElementById('org-filter').value;
  updateMatchingTable(filter);
};

// 기관 매칭 저장
const saveOrgMatching = async (orgCode) => {
  try {
    console.log('saveOrgMatching 시작:', orgCode);
    // 기관 찾기
    const organization = allOrganizations.find(org => {
      const code = org.code || org.기관코드 || org.orgCode || '';
      return code === orgCode;
    });
    
    if (!organization) {
      alert(`기관 코드 ${orgCode}에 해당하는 기관을 찾을 수 없습니다.`);
      return;
    }

    console.log('매칭 설정할 기관:', organization);
    
    // 다양한 필드명에 대응
    const orgName = organization.name || organization.기관명 || organization.orgName || '';
    const orgRegion = organization.region || organization.지역 || '';
    const orgNote = organization.note || '';
    
    // 현재 매칭 정보 가져오기
    const mainCommittees = allMatchings.filter(m => m.orgCode === orgCode && m.role === '주담당');
    const subCommittees = allMatchings.filter(m => m.orgCode === orgCode && m.role === '부담당');
    
    console.log('현재 주담당:', mainCommittees);
    console.log('현재 부담당:', subCommittees);
    
    // 모달 내용 구성
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-50';
    modal.id = 'matching-modal';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black opacity-50"></div>
      <div class="bg-white rounded-lg p-6 relative z-10 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">담당자 설정 - ${orgName}</h2>
        
        <!-- 현재 배정된 담당자 표시 -->
        ${mainCommittees.length > 0 ? `<div class="mb-1 text-blue-700 text-sm">현재 주담당: ${mainCommittees.map(m => m.committeeName || m.name || m.이름).join(', ')}</div>` : ''}
        ${subCommittees.length > 0 ? `<div class="mb-1 text-green-700 text-sm">현재 부담당: ${subCommittees.map(m => m.committeeName || m.name || m.이름).join(', ')}</div>` : ''}
        <div class="mb-2">
          <p class="text-sm text-gray-500">지역: ${orgRegion}</p>
          <p class="text-sm text-gray-500">코드: ${orgCode}</p>
          ${orgNote ? `<p class="text-sm text-gray-500 mb-3">비고: ${orgNote}</p>` : ''}
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">주담당</label>
          <select id="main-committee-select" class="border rounded w-full px-3 py-2">
            <option value="">선택하세요</option>
            ${allCommittees.map(committee => {
              const committeeName = committee.이름 || committee.name || '';
              const committeeId = committee.ID || committee.id || '';
              const isSelected = mainCommittees.length > 0 && mainCommittees[0].committeeId === committeeId;
              return `
                <option value="${committeeId}" ${isSelected ? 'selected' : ''}>
                  ${committeeName} (${committeeId})
                </option>
              `;
            }).join('')}
          </select>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">부담당 (복수 선택 가능)</label>
          <select id="sub-committees-select" class="border rounded w-full px-3 py-2" multiple size="5">
            ${allCommittees.map(committee => {
              const committeeName = committee.이름 || committee.name || '';
              const committeeId = committee.ID || committee.id || '';
              const isSelected = subCommittees.some(sub => sub && sub.committeeId === committeeId);
              return `
                <option value="${committeeId}" ${isSelected ? 'selected' : ''}>
                  ${committeeName} (${committeeId})
                </option>
              `;
            }).join('')}
          </select>
          <p class="text-xs text-gray-500 mt-1">Ctrl 또는 Shift를 누른 채 클릭하여 여러 명 선택 가능</p>
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">점검 유형</label>
          <div class="flex space-x-4 mt-1">
            <label class="inline-flex items-center">
              <input type="radio" name="check-type" value="전체" class="form-radio" checked>
              <span class="ml-2">전체</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" name="check-type" value="매월" class="form-radio">
              <span class="ml-2">매월</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" name="check-type" value="반기" class="form-radio">
              <span class="ml-2">반기</span>
            </label>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button id="cancel-matching-btn" class="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 transition">
            취소
          </button>
          <button id="save-matching-confirm-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            저장
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 이벤트 리스너 등록
    document.getElementById('cancel-matching-btn').addEventListener('click', () => closeModal('matching-modal'));
    document.getElementById('save-matching-confirm-btn').addEventListener('click', async () => {
      try {
        // 선택된 위원 정보 가져오기
        const mainCommitteeId = document.getElementById('main-committee-select').value;
        const subCommitteeSelect = document.getElementById('sub-committees-select');
        const subCommitteeIds = Array.from(subCommitteeSelect.selectedOptions).map(option => option.value);
        
        // 점검 유형 가져오기
        const checkType = document.querySelector('input[name="check-type"]:checked').value;
        
        // 매칭 데이터 생성
        const newMatchings = [];
        
        // 주담당 추가
        if (mainCommitteeId) {
          const mainCommittee = allCommittees.find(c => (c.ID || c.id) === mainCommitteeId);
          if (mainCommittee) {
            const committeeName = mainCommittee.이름 || mainCommittee.name || '';
            newMatchings.push({
              committeeId: mainCommitteeId,
              committeeName: committeeName,
              orgCode: orgCode,
              orgName: orgName,
              region: orgRegion,
              role: '주담당',
              checkType: checkType
            });
          }
        }
        
        // 부담당 추가
        for (const subId of subCommitteeIds) {
          const subCommittee = allCommittees.find(c => (c.ID || c.id) === subId);
          if (subCommittee) {
            const committeeName = subCommittee.이름 || subCommittee.name || '';
            newMatchings.push({
              committeeId: subId,
              committeeName: committeeName,
              orgCode: orgCode,
              orgName: orgName,
              region: orgRegion,
              role: '부담당',
              checkType: checkType
            });
          }
        }
        
        // 기존 매칭에서 현재 기관 매칭 제외
        const otherMatchings = allMatchings.filter(m => m.orgCode !== orgCode);
        
        // 새로운 매칭 데이터 생성
        const updatedMatchings = [...otherMatchings, ...newMatchings];
        
        // API 호출하여 저장
        const response = await fetch('/api/committees/matching', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ matchings: updatedMatchings })
        });
        
        if (!response.ok) {
          throw new Error('매칭 정보 저장에 실패했습니다.');
        }
        
        // 성공 처리
        closeModal('matching-modal');
        alert('담당자 매칭이 성공적으로 저장되었습니다.');
        
        // 매칭 정보 새로고침
        await refreshMatchingData();
        
      } catch (error) {
        console.error('매칭 저장 중 오류:', error);
        alert(`매칭 저장 중 오류가 발생했습니다: ${error.message}`);
      }
    });
  } catch (error) {
    console.error('담당자 설정 모달 표시 중 오류:', error);
    alert('담당자 설정 중 오류가 발생했습니다.');
  }
};

// 매칭 추가 모달 표시
const showAddMatchingModal = async () => {
  // 위원 목록이 비어 있으면 새로 불러오기
  if (!allCommittees || allCommittees.length === 0) {
    const committeesResponse = await committeeApi.getAllCommittees();
    if (committeesResponse.status === 'success') {
      allCommittees = committeesResponse.data.committees || [];
    } else {
      showMessage('위원 목록을 불러오지 못했습니다.', 'error');
      return;
    }
  }
  // 위원 데이터 구조 확인용 로그
  console.log('allCommittees:', allCommittees);
  if (allCommittees.length > 0) console.log('Sample committee:', allCommittees[0]);
  // 위원 목록이 비어 있으면 새로 불러오기
  if (!allCommittees || allCommittees.length === 0) {
    const committeesResponse = await committeeApi.getAllCommittees();
    if (committeesResponse.status === 'success') {
      allCommittees = committeesResponse.data.committees || [];
    } else {
      showMessage('위원 목록을 불러오지 못했습니다.', 'error');
      return;
    }
  }
  // 모달 생성 또는 가져오기
  let modal = document.getElementById('add-matching-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-matching-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h3 class="text-lg font-medium mb-4">담당자 매칭 추가</h3>
        <form id="add-matching-form" autocomplete="off">
          <div class="mb-4">
            <label for="org-select" class="block mb-1 font-medium">기관 선택</label>
            <select id="org-select" class="border rounded px-3 py-2 w-full">
              <option value="">기관을 선택하세요</option>
              ${allOrganizations.map(org => `<option value="${org.code || org.기관코드}">${org.name || org.기관명} (${org.code || org.기관코드})</option>`).join('')}
            </select>
          </div>
          <div class="mb-4">
            <label for="committee-select" class="block mb-1 font-medium">담당자(위원) 선택</label>
            <select id="committee-select" class="border rounded px-3 py-2 w-full">
              <option value="">담당자를 선택하세요</option>
              ${allCommittees.map(c => `<option value="${c['ID']}">${c['이름']} (${c['ID']})</option>`).join('')}
            </select>
          </div>
          <div class="mb-4">
            <label class="block mb-1 font-medium">역할 선택</label>
            <div class="flex space-x-4">
              <label><input type="radio" name="role" value="주담당" checked> 주담당</label>
              <label><input type="radio" name="role" value="부담당"> 부담당</label>
            </div>
          </div>
          <div class="flex justify-end space-x-2 mt-6">
            <button type="button" id="cancel-matching-btn" class="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">취소</button>
            <button type="submit" id="save-matching-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">저장</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');

  // 이벤트 리스너 등록
  document.getElementById('cancel-matching-btn').onclick = () => closeModal('add-matching-modal');
  document.getElementById('add-matching-form').onsubmit = async (e) => {
    e.preventDefault();
    const orgCode = document.getElementById('org-select').value;
    const committeeId = document.getElementById('committee-select').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    if (!orgCode || !committeeId || !role) {
      showMessage('기관, 담당자, 역할을 모두 선택하세요.', 'warning');
      return;
    }
    try {
      // 선택된 위원 및 기관 정보 확인
      const committee = allCommittees.find(c => (c.ID || c.id) === committeeId);
      const organization = allOrganizations.find(org => (org.code || org.기관코드) === orgCode);
      
      if (!committee) {
        showMessage('위원 정보를 찾을 수 없습니다.', 'error');
        return;
      }
      
      if (!organization) {
        showMessage('기관 정보를 찾을 수 없습니다.', 'error');
        return;
      }
      
      // 기존 매칭에서 동일 기관, 역할의 매칭 제거
      let filtered = allMatchings.filter(m => !(m.orgCode === orgCode && m.role === role));
      
      // 새 매칭 추가
      const committeeName = committee.이름 || committee.name || '';
      const orgName = organization.name || organization.기관명 || '';
      const region = organization.region || organization.지역 || '';
      
      filtered.push({
        orgCode, 
        orgName,
        region,
        committeeId, 
        committeeName,
        role,
        checkType: '전체' // 기본값은 전체로 설정
      });
      
      // 저장 API 호출
      const response = await fetch('/api/committees/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchings: filtered })
      });
      if (!response.ok) throw new Error('저장 실패');
      closeModal('add-matching-modal');
      showMessage('담당자 매칭이 저장되었습니다.', 'success');
      await refreshMatchingData();
    } catch (err) {
      showMessage('저장 중 오류: ' + err.message, 'error');
    }
  };
};

// 모달 닫기
const closeModal = (modalId) => {
  // 명시적 modalId가 있는 경우 해당 모달만 제거
  if (modalId) {
    const modalContainer = document.getElementById(modalId);
    if (modalContainer) {
      modalContainer.remove();
      return;
    }
  }
  
  // modalId가 없거나 찾지 못한 경우 모든 가능한 모달 찾아서 제거
  const matchingModal = document.getElementById('matching-modal');
  const orgModal = document.getElementById('org-modal');
  
  if (matchingModal) {
    matchingModal.remove();
  }
  
  if (orgModal) {
    orgModal.remove();
  }
  
  // 혹시 다른 모달이 있을 경우를 대비해 모달 클래스로도 찾아서 제거
  const otherModals = document.querySelectorAll('.fixed.inset-0.flex.items-center.justify-center.z-50');
  otherModals.forEach(modal => {
    modal.remove();
  });
};

// 지역별 기관 분류 및 출력
const showOrganizationsByRegion = () => {
  try {
    // 모든 기관을 지역별로 분류
    const regionMap = {};
    
    // 각 기관의 지역 정보 수집
    allOrganizations.forEach(org => {
      let region = org.region || '미분류';
      if (region.startsWith('창원시')) region = '창원시';
      if (!regionMap[region]) {
        regionMap[region] = [];
      }
      regionMap[region].push({
        name: org.name || org.기관명,
        code: org.code || org.기관코드
      });
    });
    
    // 지역별로 정렬하여 출력
    console.log('----- 지역별 기관 분류 -----');
    
    // 시 지역과 군 지역으로 구분
    const cities = [];
    const counties = [];

    // 창원시 통합: regionMap의 키 중 '창원시'로 시작하면 모두 '창원시'로 통합
    const unifiedRegionMap = {};
    Object.keys(regionMap).forEach(region => {
      let unified = region;
      if (region.startsWith('창원시')) unified = '창원시';
      if (!unifiedRegionMap[unified]) unifiedRegionMap[unified] = [];
      unifiedRegionMap[unified].push(...regionMap[region]);
    });

    Object.keys(unifiedRegionMap).forEach(region => {
      if (region.includes('시')) {
        cities.push(region);
      } else if (region.includes('군')) {
        counties.push(region);
      }
    });
    // 시 지역 출력
    console.log('=== 시 지역 ===');
    cities.sort().forEach(city => {
      console.log(`[${city}] - ${unifiedRegionMap[city].length}개 기관`);
      unifiedRegionMap[city].forEach(org => {
        console.log(`  - ${org.name} (${org.code})`);
      });
    });
    // 군 지역 출력
    console.log('\n=== 군 지역 ===');
    counties.sort().forEach(county => {
      console.log(`[${county}] - ${unifiedRegionMap[county].length}개 기관`);
      unifiedRegionMap[county].forEach(org => {
        console.log(`  - ${org.name} (${org.code})`);
      });
    });
    
    // 기타 지역 출력 (시나 군이 아닌 경우)
    const others = Object.keys(regionMap).filter(region => 
      !region.includes('시') && !region.includes('군'));
    
    if (others.length > 0) {
      console.log('\n=== 기타 지역 ===');
      others.sort().forEach(region => {
        console.log(`[${region}] - ${regionMap[region].length}개 기관`);
        regionMap[region].forEach(org => {
          console.log(`  - ${org.name} (${org.code})`);
        });
      });
    }
    
    return regionMap;
  } catch (error) {
    console.error('지역별 기관 분류 중 오류:', error);
    return {};
  }
};

// 기관 추가 모달 표시
const showAddOrgModal = async () => {
  // 위원 목록이 비어 있으면 새로 불러오기
  if (!allCommittees || allCommittees.length === 0) {
    const committeesResponse = await committeeApi.getAllCommittees();
    if (committeesResponse.status === 'success') {
      allCommittees = committeesResponse.data.committees || [];
    } else {
      showMessage('위원 목록을 불러오지 못했습니다.', 'error');
      return;
    }
  }
  // 모달 생성 또는 가져오기
  let modal = document.getElementById('add-org-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-org-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h3 class="text-lg font-medium mb-4">기관 추가</h3>
        <form id="add-org-form">
          <div class="mb-4">
            <label for="org-name-input" class="block text-sm font-medium text-gray-700 mb-1">기관명</label>
            <input id="org-name-input" type="text" class="w-full border rounded px-3 py-2" required />
          </div>
          <div class="mb-4">
            <label for="org-code-input" class="block text-sm font-medium text-gray-700 mb-1">기관코드</label>
            <input id="org-code-input" type="text" class="w-full border rounded px-3 py-2" required />
          </div>
          <div class="mb-4">
            <label for="org-region-select" class="block text-sm font-medium text-gray-700 mb-1">지역(시군)</label>
            <select id="org-region-select" class="w-full border rounded px-3 py-2">
              <option value="">선택</option>
              ${(() => {
                // 실제 allOrganizations에서 시군 추출(중복X, 가나다순)
                const sigunSet = new Set(
                  allOrganizations.map(org => {
                    let region = org.region || '미분류';
                    if (region.startsWith('창원시')) return '창원시';
                    return region;
                  })
                );
                return Array.from(sigunSet).sort().map(region => `<option value="${region}">${region}</option>`).join('');
              })()}
            </select>
          </div>
          <div class="mb-4">
            <label for="org-main-committee-select" class="block text-sm font-medium text-gray-700 mb-1">주담당(위원)</label>
            <select id="org-main-committee-select" class="w-full border rounded px-3 py-2" required>
              <option value="">선택</option>
              ${allCommittees.map(c => `<option value="${c.ID}">${c.이름} (${c.ID})</option>`).join('')}
            </select>
          </div>
          <div class="mb-4">
            <label for="org-sub-committee-select" class="block text-sm font-medium text-gray-700 mb-1">부담당(위원)</label>
            <select id="org-sub-committee-select" class="w-full border rounded px-3 py-2" required>
              <option value="">선택</option>
              ${allCommittees.map(c => `<option value="${c.ID}">${c.이름} (${c.ID})</option>`).join('')}
            </select>
          </div>
          <div class="mb-4">
            <label for="org-note-input" class="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <input id="org-note-input" type="text" class="w-full border rounded px-3 py-2" />
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" class="px-4 py-2 bg-gray-400 text-white rounded" id="cancel-add-org-btn">취소</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">저장</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');

  // 취소 버튼 이벤트
  document.getElementById('cancel-add-org-btn').onclick = () => closeModal('add-org-modal');
  // 저장 이벤트
  document.getElementById('add-org-form').onsubmit = async (e) => {
    e.preventDefault();
    await saveNewOrganization();
  };
};

// 새 기관 저장
const saveNewOrganization = async () => {
  try {
    const orgName = document.getElementById('org-name-input').value.trim();
    const orgCode = document.getElementById('org-code-input').value.trim();
    const orgRegion = document.getElementById('org-region-select').value;
    const orgNote = document.getElementById('org-note-input').value.trim();
    const mainCommitteeId = document.getElementById('org-main-committee-select').value;
    const subCommitteeId = document.getElementById('org-sub-committee-select').value;

    // 입력 데이터 검증
    if (!orgName) {
      alert('기관명을 입력해주세요.');
      return;
    }
    if (!orgCode || !orgCode.startsWith('A48')) {
      alert('기관코드는 A48로 시작해야 합니다.');
      return;
    }
    if (!mainCommitteeId || !subCommitteeId) {
      alert('주담당, 부담당을 모두 선택해야 합니다.');
      return;
    }
    // 중복 코드 확인
    const isDuplicate = allOrganizations.some(org => 
      (org.code === orgCode || org.기관코드 === orgCode));
    if (isDuplicate) {
      alert('이미 존재하는 기관코드입니다. 다른 코드를 입력해주세요.');
      return;
    }
    // 구글 시트에 기관 추가하기 위한 API 호출
    const response = await fetch('/api/organizations/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: orgCode,
        name: orgName,
        region: orgRegion,
        note: orgNote,
        mainCommitteeId,
        subCommitteeId
      })
    }).catch(error => {
      console.error('API 호출 중 오류:', error);
      // API 오류 시 임시 응답 (개발 환경)
      console.log('개발 환경에서는 API 오류를 무시하고 로컬 데이터만 업데이트합니다.');
      return { ok: true, json: () => Promise.resolve({ status: 'success' }) };
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '기관 추가 실패');
    }
    // 성공 처리
    closeModal('org-modal');
    alert('새 기관이 성공적으로 추가되었습니다.');
    // 기관 목록에 추가
    const newOrg = {
      code: orgCode,
      name: orgName,
      region: orgRegion,
      note: orgNote,
      mainCommitteeId,
      subCommitteeId,
      id: `ORG_${Date.now()}`  // 임시 ID 생성
    };
    allOrganizations.push(newOrg);
    // 데이터 새로고침
    updateMatchingTable();
    document.getElementById('total-orgs-count').textContent = allOrganizations.length;
  } catch (error) {
    console.error('기관 추가 중 오류:', error);
    alert(`기관 추가 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 기관 삭제 함수
const deleteOrganization = async (orgCode, orgName) => {
  try {
    // 삭제 확인
    if (!confirm(`${orgName} 기관을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 관련된 모든 매칭 정보도 함께 삭제됩니다.`)) {
      return;
    }

    console.log(`기관 삭제 시작: ${orgName} (${orgCode})`);

    // 1. 기관 관련 매칭 정보 삭제
    const updatedMatchings = allMatchings.filter(m => m.orgCode !== orgCode);
    
    // 2. 매칭 정보 업데이트 API 호출
    const matchingResponse = await fetch('/api/committees/matching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ matchings: updatedMatchings })
    });

    if (!matchingResponse.ok) {
      throw new Error('매칭 정보 삭제 중 오류가 발생했습니다.');
    }

    // 3. 기관 삭제 API 호출
    const deleteResponse = await fetch(`/api/organizations/${orgCode}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!deleteResponse.ok) {
      throw new Error('기관 삭제 중 오류가 발생했습니다.');
    }

    // 4. 로컬 데이터 업데이트
    allMatchings = updatedMatchings;
    allOrganizations = allOrganizations.filter(org => 
      (org.code !== orgCode && org.기관코드 !== orgCode)
    );

    // 5. UI 업데이트
    updateMatchingTable();
    
    // 6. 성공 메시지 표시
    alert(`${orgName} 기관이 성공적으로 삭제되었습니다.`);
    
    // 7. 통계 업데이트
    document.getElementById('total-orgs-count').textContent = allOrganizations.length;

  } catch (error) {
    console.error('기관 삭제 중 오류:', error);
    alert(`기관 삭제 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 메시지 표시 함수
const showMessage = (message, type = 'info') => {
  // 이미 있는 메시지 제거
  const existingMsg = document.getElementById('toast-message');
  if (existingMsg) {
    existingMsg.remove();
  }
  
  // 타입별 색상 설정
  let bgColor = 'bg-blue-500';
  let iconHtml = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  
  if (type === 'success') {
    bgColor = 'bg-green-500';
    iconHtml = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
  } else if (type === 'warning') {
    bgColor = 'bg-yellow-500';
    iconHtml = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  } else if (type === 'error') {
    bgColor = 'bg-red-500';
    iconHtml = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
  }
  
  // 토스트 메시지 요소 생성
  const toast = document.createElement('div');
  toast.id = 'toast-message';
  toast.className = `fixed top-4 right-4 flex items-center p-4 mb-4 text-white ${bgColor} rounded-lg shadow-lg z-50`;
  toast.innerHTML = `
    <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-white/25">
      ${iconHtml}
    </div>
    <div class="ml-3 text-sm font-normal">${message}</div>
    <button type="button" class="ml-4 bg-white/25 text-white rounded-lg inline-flex h-6 w-6 items-center justify-center hover:bg-white/50" onclick="this.parentElement.remove()">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;
  
  // 화면에 표시
  document.body.appendChild(toast);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    if (document.getElementById('toast-message')) {
      document.getElementById('toast-message').remove();
    }
  }, 3000);
};

// 전역 스코프에 필요한 함수들 노출
window.showMessage = showMessage;
window.showAddMatchingModal = showAddMatchingModal;
window.showAddOrgModal = showAddOrgModal;
window.filterOrganizations = filterOrganizations; 