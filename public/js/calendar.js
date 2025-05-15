// 캘린더 관련 JavaScript 코드
document.addEventListener('DOMContentLoaded', function() {
  // 전역 변수
  let currentDate = new Date();
  let schedules = [];
  let organizations = [];
  let committees = [];
  let currentUser = null;
  let isDataLoading = false;
  let committeeMap = {}; // 위원 ID -> 이름 매핑 캐시 추가
  
  // 로컬 스토리지 키 상수
  const LOCAL_STORAGE_SCHEDULES_KEY = 'calendar_schedules';
  const LOCAL_STORAGE_LAST_UPDATE_KEY = 'calendar_last_update';
  
  // 위원 번호에 따라 실제 이름으로 매핑하는 객체
  const committeeNameMapping = {
    1: '김수연',
    2: '이연숙',
    3: '이정혜',
    4: '문일지',
    5: '신용기'
  };
  
  // '모니터링위원N' 형식의 이름을 실제 이름으로 변환하는 함수
  function mapCommitteeName(originalName) {
    if (!originalName) return null;
    
    // '모니터링위원' 패턴 확인
    if (originalName.startsWith('모니터링위원')) {
      // 숫자 부분 추출 (예: '모니터링위원1' -> '1')
      const numMatch = originalName.match(/모니터링위원(\d+)/);
      if (numMatch && numMatch[1]) {
        const committeeNum = parseInt(numMatch[1], 10);
        // 번호에 따라 실제 이름 반환
        if (committeeNameMapping[committeeNum]) {
          return committeeNameMapping[committeeNum];
        }
      }
    }
    
    // 패턴이 맞지 않으면 원래 이름 반환
    return originalName;
  }
  
  // 초기화 함수 최적화
  async function initialize() {
    try {
      console.time('캘린더 초기화 시간');
      console.log('캘린더 초기화 시작...');
      
      // 로딩 표시기 추가
      showLoadingIndicator();
      
      // 동적 스타일 추가
      addCalendarStyles();
      
      // 달력 먼저 빈 상태로 렌더링
      renderCalendar(currentDate);
      
      // 이벤트 리스너 설정
      setupEventListeners();
      
      // 단계 1: 현재 사용자 정보 로드
      currentUser = await getCurrentUser().catch(err => {
        console.error('사용자 정보 로드 실패:', err);
        return null;
      });
      
      // 현재 사용자 정보가 없으면 로그인이 필요한 상태
      if (!currentUser) {
        console.warn('로그인된 사용자 정보가 없습니다. 로그인 화면으로 이동이 필요할 수 있습니다.');
        hideLoadingIndicator();
        showNotification('로그인 정보를 확인할 수 없습니다. 페이지를 새로고침하거나 다시 로그인해주세요.', 'warning');
        return;
      }
      
      console.log(`초기화 - 현재 사용자: ${currentUser.name}, 역할: ${currentUser.role}, ID: ${currentUser.id}`);
      
      // localStorage에 현재 사용자 정보를 저장
      localStorage.setItem('currentCommittee', JSON.stringify(currentUser));
      
      // 단계 2: 매칭 데이터 로드 (최우선)
      await loadMasterMatchingData().catch(err => {
        console.error('매칭 정보 로드 실패:', err);
      });
      
      // 단계 3: 필수 데이터 병렬 로드
      const [committeesResult, organizationsResult] = await Promise.all([
        getCommittees().catch(err => {
          console.error('위원 목록 로드 실패:', err);
          return null;
        }),
        getOrganizations().catch(err => {
          console.error('기관 목록 로드 실패:', err);
          return null;
        })
      ]);
      
      // 드롭다운 업데이트
      updateCommitteeDropdown();
      updateOrganizationDropdown();
      
      // 단계 4: 일정 데이터 로드 및 캘린더 최종 업데이트
      // 먼저 로컬 스토리지에서 데이터를 복원 시도
      const localDataRestored = restoreSchedulesFromLocalStorage();
      
      if (localDataRestored) {
        console.log('로컬 스토리지에서 일정 데이터 복원 성공:', schedules.length);
        renderCalendar(currentDate);
      }
      
      // 그 후에 API에서 데이터 가져오기 시도 (로컬 데이터가 있어도 항상 시도)
      await getSchedules().catch(err => {
        console.error('일정 데이터 로드 오류:', err);
        if (!localDataRestored) {
          // API와 로컬 모두 실패한 경우에만 경고
          showNotification('서버에서 일정을 가져올 수 없습니다. 페이지를 새로고침하거나 나중에 다시 시도해 주세요.', 'warning');
        }
      });
      
      // 로컬 스토리지에 저장된 타겟 날짜가 있는지 확인
      const targetDate = localStorage.getItem('calendar_target_date');
      if (targetDate) {
        console.log(`저장된 타겟 날짜 발견: ${targetDate}, 해당 날짜로 이동합니다.`);
        goToCalendarDate(targetDate);
        
        // 저장된 날짜 데이터 삭제
        localStorage.removeItem('calendar_target_date');
        localStorage.removeItem('calendar_from_report');
      } else {
        // 타겟 날짜가 없으면 현재 날짜로 달력 업데이트
        renderCalendar(currentDate);
      }
      
      console.log('모든 데이터 로드 완료: 위원 수:', committees.length, '기관 수:', organizations.length, '일정 수:', schedules.length);
      
      // 로컬 스토리지에 백업
      saveSchedulesToLocalStorage();
      
      // 로딩 표시기 제거
      hideLoadingIndicator();
      console.timeEnd('캘린더 초기화 시간');
      console.log('초기화 완료 - UI 렌더링 준비됨');
      
    } catch (error) {
      console.error('초기화 오류:', error);
      hideLoadingIndicator();
      showNotification('오류가 발생했습니다. 페이지를 새로고침해 주세요.', 'error');
    }
  }
  
  // 마스터 페이지에서 기관-위원 매칭 정보 로드
  async function loadMasterMatchingData() {
    // 이미 로드되었거나 로딩 중인 경우 중복 실행 방지
    if (window.allMatchings && window.allOrganizations || isDataLoading) {
      console.log('이미 마스터 페이지에서 매칭 정보가 로드되어 있거나 로딩 중입니다');
      return;
    }
    
    isDataLoading = true;
    
    try {
      console.log('마스터 페이지에서 매칭 정보 로드 시도...');
      
      // 기관-위원 매칭 정보 가져오기
      let matchingsResult = null;
      let matchingsResponse;
      
      // 현재 사용자가 일반 위원인 경우 위원별 매칭 API 먼저 시도
      if (currentUser && currentUser.role !== 'master' && currentUser.id) {
        // 위원 ID에서 'C' 접두사 제거하고 숫자만 추출
        const committeeIdRaw = currentUser.id;
        let committeeIdWithoutPrefix = committeeIdRaw.replace(/^C/i, '');
        
        // 위원 ID가 숫자가 아닌 이름으로 구성된 경우 (ex: "C문일지")
        if (isNaN(parseInt(committeeIdWithoutPrefix))) {
          // ID에서 'C' 접두사 제거
          committeeIdWithoutPrefix = committeeIdRaw.startsWith('C') 
            ? committeeIdRaw.substring(1)  // C문일지 -> 문일지
            : committeeIdRaw;             // 문일지 -> 문일지
            
          console.log(`위원 이름 기반 ID: ${committeeIdWithoutPrefix}`);
        }
        
        console.log(`현재 위원(${currentUser.id})의 매칭 정보 로드 시도 - API 호출 ID: ${committeeIdWithoutPrefix}`);
        
        // 가장 성공 확률이 높은 엔드포인트를 먼저 시도 (서버 로그 기반 분석)
        const priorityEndpoint = `/api/committees/matchings?committeeId=${committeeIdWithoutPrefix}`;
        console.log(`우선 엔드포인트 시도: ${priorityEndpoint}`);
        
        try {
          matchingsResponse = await fetch(priorityEndpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            credentials: 'include'
          });
          
          if (matchingsResponse.ok) {
            matchingsResult = await matchingsResponse.json();
            console.log(`위원별 매칭 API 호출 성공 (${priorityEndpoint})`);
            
            if (matchingsResult.status === 'success' && matchingsResult.data && matchingsResult.data.matchings) {
              console.log(`매칭 데이터 로드 성공: ${matchingsResult.data.matchings.length}개`);
            } else {
              matchingsResult = null; // 유효한 데이터가 없으면 null로 설정하여 다음 시도로 넘어가게 함
              console.warn(`위원별 매칭 API 응답은 성공했지만 데이터가 유효하지 않음 (${priorityEndpoint})`);
            }
          } else {
            console.warn(`위원별 매칭 API 응답 오류 (${priorityEndpoint}): ${matchingsResponse.status}`);
          }
        } catch (err) {
          console.warn(`위원별 매칭 API 호출 실패 (${priorityEndpoint}):`, err);
        }
        
        // 우선 엔드포인트 실패 시 다른 엔드포인트 시도
        if (!matchingsResult || !matchingsResult.data || !matchingsResult.data.matchings) {
          // 여러 API 엔드포인트 형식 시도
          const apiEndpoints = [
            `/api/committees/${committeeIdWithoutPrefix}/matchings`,
            `/api/committees/matching/${committeeIdWithoutPrefix}`,
            `/api/committees/${committeeIdRaw}/matchings`,
            `/api/matchings/committee/${committeeIdWithoutPrefix}`
          ];
          
          // 각 엔드포인트 시도
          for (const endpoint of apiEndpoints) {
            try {
              console.log(`API 엔드포인트 시도: ${endpoint}`);
              const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                credentials: 'include'
              });
              
              if (response.ok) {
                const result = await response.json();
                if (result.status === 'success' && result.data && result.data.matchings) {
                  console.log(`위원별 매칭 API 호출 성공 (${endpoint})`);
                  matchingsResult = result;
                  break; // 성공한 경우 루프 종료
                } else {
                  console.warn(`위원별 매칭 API 응답은 성공했지만 데이터가 유효하지 않음 (${endpoint})`);
                }
              } else {
                console.warn(`위원별 매칭 API 응답 오류 (${endpoint}): ${response.status}`);
              }
            } catch (err) {
              console.warn(`위원별 매칭 API 호출 실패 (${endpoint}):`, err);
            }
          }
        }
      }
      
      // 위원별 매칭 API 시도가 실패했거나 관리자인 경우 전체 매칭 API 시도
      if (!matchingsResult || !matchingsResult.data || !matchingsResult.data.matchings) {
        console.log('전체 매칭 정보 로드 시도');
        
        // 여러 가능한 엔드포인트 시도
        const apiEndpoints = [
          '/api/committees/matchings',
          '/api/committees/matching',
          '/api/matchings'
        ];
        
        for (const endpoint of apiEndpoints) {
          try {
            console.log(`API 엔드포인트 시도: ${endpoint}`);
            matchingsResponse = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              },
              credentials: 'include'
            });
            
            if (matchingsResponse.ok) {
              matchingsResult = await matchingsResponse.json();
              console.log(`기본 매칭 API 호출 성공 (${endpoint})`);
              break; // 성공한 경우 루프 종료
            } else {
              console.warn(`기본 매칭 API 응답 오류 (${endpoint}): ${matchingsResponse.status}`);
            }
          } catch (err) {
            console.warn(`기본 매칭 API 호출 실패 (${endpoint}):`, err);
          }
        }
      }
      
      // 매칭 결과 처리
      if (matchingsResult && matchingsResult.status === 'success' && matchingsResult.data && matchingsResult.data.matchings) {
        // 전역 객체에 매칭 정보 저장
        window.allMatchings = matchingsResult.data.matchings;
        console.log('매칭 정보 로드 성공:', window.allMatchings.length, '개');
        
        if (window.allMatchings.length > 0) {
          console.log('매칭 정보 샘플:', window.allMatchings.slice(0, 3));
        }
        
        // 현재 사용자의 매칭 정보 필터링
        if (currentUser && currentUser.role !== 'master') {
          // 다양한 사용자 ID 형식 처리 (확장)
          const userIdVariations = [];
          
          // 원시 ID 형식 추가
          if (currentUser.id) {
            userIdVariations.push(currentUser.id);
            
            // C 접두사 있는 경우 제거, 없는 경우 추가
            if (currentUser.id.startsWith('C')) {
              userIdVariations.push(currentUser.id.substring(1));
            } else {
              userIdVariations.push(`C${currentUser.id}`);
            }
            
            // 이름 기반 ID 형식 추가
            if (currentUser.name) {
              userIdVariations.push(`C${currentUser.name}`);
            }
          }
          
          // 현재 사용자의 매칭 정보 필터링 - 향상된 필터링 로직
          const userMatchings = window.allMatchings.filter(match => {
            // ID로 매칭 시도
            const idMatched = userIdVariations.some(id => 
              match.committeeId === id || 
              match.committeeId === id.replace(/^C/, '') || 
              match.committeeId === `C${id}`
            );
            
            // 이름으로 매칭 시도
            const nameMatched = currentUser.name && match.committeeName === currentUser.name;
            
            return idMatched || nameMatched;
          });
          
          console.log(`현재 위원(${currentUser.name})의 매칭 정보:`, userMatchings.length, '개');
          
          if (userMatchings.length > 0) {
            // 매칭된 기관 코드 추출 (중복 제거)
            const matchedOrgCodes = [...new Set(userMatchings.map(match => match.orgCode))];
            console.log(`현재 위원 담당 기관 수: ${matchedOrgCodes.length}개`);
            console.log(`담당 기관 코드: ${JSON.stringify(matchedOrgCodes)}`);
          }
        }
      } else {
        console.warn('매칭 정보 로드 실패 - 모든 API 시도 실패');
        window.allMatchings = []; // 빈 배열로 초기화
      }
      
      // 모든 기관 정보 가져오기 - 여러 엔드포인트 시도
      let orgsResponse;
      let orgsResult;
      
      // 여러 가능한 기관 API 엔드포인트 시도
      const orgApiEndpoints = [
        '/api/organizations',
        '/api/organizations/all',
        '/api/organizations/test'
      ];
      
      for (const endpoint of orgApiEndpoints) {
        try {
          console.log(`기관 API 엔드포인트 시도: ${endpoint}`);
          orgsResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (orgsResponse.ok) {
            orgsResult = await orgsResponse.json();
            console.log(`기관 API 호출 성공 (${endpoint})`);
            break; // 성공한 경우 루프 종료
          } else {
            console.warn(`기관 API 응답 오류 (${endpoint}): ${orgsResponse.status}`);
          }
        } catch (err) {
          console.warn(`기관 API 호출 실패 (${endpoint}):`, err);
        }
      }
      
      // 기관 결과 처리
      if (orgsResult && orgsResult.status === 'success' && orgsResult.data && orgsResult.data.organizations) {
        // 전역 객체에 기관 정보 저장
        window.allOrganizations = orgsResult.data.organizations;
        console.log('기관 정보 로드 성공:', window.allOrganizations.length, '개');
        console.log('기관 정보 샘플:', window.allOrganizations.slice(0, 3));
      } else {
        console.warn('기관 정보 로드 실패 - 모든 API 시도 실패');
        
        // 매칭 정보에서 기관 정보 추출
        if (window.allMatchings && window.allMatchings.length > 0) {
          console.log('매칭 정보에서 기관 정보 추출 시도');
          
          // 고유한 기관 코드 집합 생성
          const uniqueOrgCodes = new Set();
          window.allMatchings.forEach(match => {
            if (match.orgCode) {
              uniqueOrgCodes.add(match.orgCode);
            }
          });
          
          // 고유한 기관 정보 목록 생성
          window.allOrganizations = Array.from(uniqueOrgCodes).map(orgCode => {
            // 해당 기관 코드의 첫 번째 매칭 정보 찾기
            const matchingInfo = window.allMatchings.find(m => m.orgCode === orgCode);
            return {
              code: orgCode,
              name: matchingInfo ? matchingInfo.orgName : `기관 ${orgCode}`,
              region: matchingInfo ? matchingInfo.region : ''
            };
          });
          
          console.log('매칭 정보에서 추출한 기관 정보:', window.allOrganizations.length, '개');
        } else {
          window.allOrganizations = []; // 빈 배열로 초기화
        }
      }
      
      // 기관 드롭다운 업데이트
      updateOrganizationDropdown();
      
    } catch (error) {
      console.warn('매칭 정보 로드 중 오류:', error);
      // 오류 시 빈 배열로 초기화
      window.allMatchings = [];
      window.allOrganizations = [];
    } finally {
      isDataLoading = false;
    }
  }
  
  // 달력 렌더링 함수
  function renderCalendar(date) {
    // 캘린더 요소 가져오기
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearElement = document.getElementById('month-year');
    
    if (!calendarGrid || !monthYearElement) {
      console.error('캘린더 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 날짜 데이터 설정
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // 월 이름 배열
    const monthNames = [
      '1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    
    // 제목 업데이트
    monthYearElement.textContent = `${year}년 ${monthNames[month]}`;
    
    // 캘린더 초기화
    calendarGrid.innerHTML = '';
    
    // 요일 이름 배열 - 평일만 (월~금)
    const dayNames = ['월', '화', '수', '목', '금'];
    
    // 요일 헤더 추가
    const weekdaysRow = document.createElement('div');
    weekdaysRow.classList.add('weekdays');
    
    for (let i = 0; i < 5; i++) {
      const dayEl = document.createElement('div');
      dayEl.classList.add('weekday');
      dayEl.textContent = dayNames[i];
      weekdaysRow.appendChild(dayEl);
    }
    
    calendarGrid.appendChild(weekdaysRow);
    
    // 한 달의 첫 날과 마지막 날 계산
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 월의 첫 날이 무슨 요일인지 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const firstDayOfWeek = firstDay.getDay();
    
    // 실제 캘린더에 표시할 첫 날짜 계산
    // 평일만 표시 (월요일부터)하므로 월요일이 첫 날짜가 되도록 조정
    let startDate = new Date(firstDay);
    
    // 첫 날이 토요일이나 일요일이면 다음 주 월요일로 이동
    if (firstDayOfWeek === 0) { // 일요일
      startDate.setDate(startDate.getDate() + 1); // 다음 날(월요일)로 설정
    } else if (firstDayOfWeek === 6) { // 토요일
      startDate.setDate(startDate.getDate() + 2); // 월요일로 설정
    } else if (firstDayOfWeek > 1) { // 화~금요일이면
      startDate.setDate(startDate.getDate() - (firstDayOfWeek - 1)); // 해당 주 월요일로 설정
    }
    
    // 현재 날짜 설정
    let currentDate = new Date(startDate);
    
    // 주별로 달력 행 생성
    let calendarRow = document.createElement('div');
    calendarRow.classList.add('calendar-row');
    
    // 달력 날짜 채우기
    while (currentDate.getMonth() <= month) {
      // 현재 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
      const dayOfWeek = currentDate.getDay();
      
      // 평일만 표시 (월~금)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // 현재 행이 꽉 찼으면 새 행 생성
        if (calendarRow.children.length === 5) {
          calendarGrid.appendChild(calendarRow);
          calendarRow = document.createElement('div');
          calendarRow.classList.add('calendar-row');
        }
        
        // 날짜 셀 생성
        const dateCell = document.createElement('div');
        dateCell.classList.add('calendar-cell');
        
        // 현재 달에 해당하는 날짜만 표시하고, 다른 달의 날짜는 빈 셀로 처리
        if (currentDate.getMonth() === month) {
          // 날짜 셀 내용 구성
          const dateNum = document.createElement('div');
          dateNum.classList.add('date-num');
          dateNum.textContent = currentDate.getDate();
          dateCell.appendChild(dateNum);
          
          // 날짜 데이터 속성 추가
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          dateCell.setAttribute('data-date', dateString);
          
          // 오늘 날짜 강조
          const today = new Date();
          if (year === today.getFullYear() && month === today.getMonth() && currentDate.getDate() === today.getDate()) {
            dateCell.classList.add('today');
          }
          
          // 일정 표시
          const dateSchedules = schedules.filter(schedule => {
            const scheduleDate = schedule.scheduleDate || schedule.date || schedule.visitDate || schedule.startDate;
            return scheduleDate && scheduleDate.startsWith(dateString);
          });
          
          if (dateSchedules.length > 0) {
            // 일정이 있는 날짜에는 특별한 클래스 추가
            dateCell.classList.add('has-events');
            
            // 일정 표시를 위한 컨테이너 추가
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            
            // 평일 표시에서는 한 칸이 넓어지므로 표시 개수 증가
            const displayLimit = 4; // 최대 4개까지 표시
            const displayCount = Math.min(displayLimit, dateSchedules.length);
            
            for (let i = 0; i < displayCount; i++) {
              const event = document.createElement('div');
              event.classList.add('event');
              
              // 일정 상태에 따른 클래스 추가
              if (dateSchedules[i].status === 'completed') {
                event.classList.add('completed');
              } else if (dateSchedules[i].status === 'pending') {
                event.classList.add('pending');
              }
              
              // 위원별 색상 적용
              if (dateSchedules[i].color) {
                // 테두리 스타일 강화
                event.style.borderLeftColor = dateSchedules[i].color;
                event.style.borderLeftWidth = '4px'; // 좀 더 두껍게
                event.style.borderLeftStyle = 'solid';
                
                // 방문기관 텍스트 배경색을 위원별 색상으로 설정 (투명도 적용)
                const colorHex = dateSchedules[i].color;
                
                // 배경색 설정 (15% 투명도)
                event.style.backgroundColor = `${colorHex}15`;
                event.style.borderRadius = '4px';
                
                // 추가 테두리 효과 (30% 투명도)
                event.style.border = `1px solid ${colorHex}30`;
                
                // 위원 구분을 위한 추가적인 시각적 표시
                const committeeIndicator = document.createElement('span');
                committeeIndicator.classList.add('committee-indicator');
                committeeIndicator.style.backgroundColor = colorHex;
                event.appendChild(committeeIndicator);
                
                // 디버깅 로그 추가
                console.log(`이벤트에 색상 적용: ${colorHex}, 일정 ID: ${dateSchedules[i].id}`);
              } else {
                console.warn(`일정에 색상 정보 없음: ${dateSchedules[i].id}, 위원: ${dateSchedules[i].committeeName || dateSchedules[i].committeeId || '정보 없음'}`);
              }
              
              // 현재 로그인한 사용자의 일정인 경우 강조 표시
              if (currentUser && dateSchedules[i].committeeId === currentUser.id) {
                event.classList.add('my-event');
                event.style.fontWeight = 'bold';
                event.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
              }
              
              // 짧은 제목 표시
              const eventTitle = document.createElement('span');
              eventTitle.classList.add('event-title');
              const title = dateSchedules[i].title || (dateSchedules[i].orgName ? `${dateSchedules[i].orgName} 방문` : '제목 없음');
              
              // 평일만 표시하므로 이름을 더 길게 표시할 수 있음
              eventTitle.textContent = title.length > 20
                ? title.substring(0, 17) + '...'
                : title;
                
              // 방문기관명에 색상 강조 스타일 추가
              eventTitle.style.color = '#333'; // 기본 글자색
              eventTitle.style.fontWeight = 'medium'; // 약간 굵게 표시
              
              // 위원 이름 표시 (짧게)
              const committeeSpan = document.createElement('small');
              committeeSpan.classList.add('event-committee');
              
              // 표시할 위원 이름 결정
              let displayCommitteeName = dateSchedules[i].committeeName || '';
              
              // 현재 로그인 사용자와 일정의 위원 ID가 일치하면 현재 사용자 이름 사용
              if (currentUser && dateSchedules[i].committeeId === currentUser.id) {
                displayCommitteeName = currentUser.name;
              }
              
              committeeSpan.textContent = displayCommitteeName;
              committeeSpan.style.marginLeft = '3px';
              committeeSpan.style.opacity = '0.8';
              committeeSpan.style.fontSize = '0.8em';
              
              // 위원 이름 배경색 추가
              if (dateSchedules[i].color) {
                const colorHex = dateSchedules[i].color;
                committeeSpan.style.backgroundColor = `${colorHex}20`;
                committeeSpan.style.color = colorHex;
                committeeSpan.style.padding = '0px 4px';
                committeeSpan.style.borderRadius = '2px';
                committeeSpan.style.border = `1px solid ${colorHex}30`;
              }
              
              event.appendChild(eventTitle);
              event.appendChild(committeeSpan);
              eventsContainer.appendChild(event);
            }
            
            // 추가 일정이 있는 경우 표시
            if (dateSchedules.length > displayLimit) {
              const more = document.createElement('div');
              more.classList.add('more-events');
              more.textContent = `+${dateSchedules.length - displayLimit}`;
              eventsContainer.appendChild(more);
            }
            
            dateCell.appendChild(eventsContainer);
            
            // 클릭 이벤트 리스너 추가 (날짜 클릭 시 해당 날짜의 모든 일정 표시)
            dateCell.addEventListener('click', () => showDateSchedules(dateString));
          } else {
            // 일정이 없는 날짜도 클릭 가능하게 설정 (일정 추가 모달 표시)
            dateCell.addEventListener('click', () => showAddScheduleModal(dateString));
          }
        } else {
          // 다른 달의 날짜는 빈 셀로 처리
          dateCell.classList.add('empty');
        }
        
        // 행에 날짜 셀 추가
        calendarRow.appendChild(dateCell);
      }
      
      // 다음 날짜로 이동
      currentDate.setDate(currentDate.getDate() + 1);
      
      // 월이 변경되고, 새로운 주가 시작될 때(월요일)에만 계속 진행
      // 금요일까지 표시했는데 월이 바뀌면 더 이상 표시하지 않음
      if (currentDate.getMonth() > month && currentDate.getDay() === 1) {
        break;
      }
    }
    
    // 마지막 행에 셀이 5개가 되지 않으면 빈 셀로 채우기
    while (calendarRow.children.length < 5) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('calendar-cell', 'empty');
      calendarRow.appendChild(emptyCell);
    }
    
    // 마지막 행 추가
    if (calendarRow.children.length > 0) {
      calendarGrid.appendChild(calendarRow);
    }
  }
  
  // 일정 추가 모달 표시 함수
  async function showAddScheduleModal(date) {
    try {
      // 모달 초기화
      const modal = document.getElementById('schedule-form-modal');
      const modalTitle = document.getElementById('schedule-form-title');
      const form = document.getElementById('schedule-form');
      
      if (!modal || !modalTitle || !form) {
        console.error('일정 추가 모달 요소를 찾을 수 없습니다.');
        return;
      }
      
      // 모달 제목 설정
      modalTitle.textContent = `${date} 일정 추가`;
      
      // 양식 초기화
      form.reset();
      
      // 숨겨진 ID 필드 초기화
      const scheduleIdField = document.getElementById('schedule-id');
      if (scheduleIdField) {
        scheduleIdField.value = '';
      }
      
      // 날짜 필드 설정
      const dateField = document.getElementById('schedule-date');
      if (dateField) {
        dateField.value = date;
      }
      
      // "저장" 버튼 텍스트 변경
      const saveButton = document.getElementById('save-schedule-btn');
      if (saveButton) {
        saveButton.textContent = '일정 추가';
      }
      
      // 일정 저장 버튼 이벤트 설정
      if (saveButton) {
        // 기존 이벤트 리스너 제거
        const newSaveButton = saveButton.cloneNode(true);
        saveButton.parentNode.replaceChild(newSaveButton, saveButton);
        
        // 새 이벤트 리스너 추가
        newSaveButton.addEventListener('click', async () => {
          await addSchedule();
        });
      }
      
      // 모달 표시
      modal.style.display = 'block';
      
      // 드롭다운 업데이트 (현재 로그인 사용자 정보 반영)
      updateCommitteeDropdown();
      updateOrganizationDropdown();
      
    } catch (error) {
      console.error('일정 추가 모달 표시 중 오류:', error);
      showNotification('일정 추가 모달을 표시하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  // 이벤트 리스너 설정
  function setupEventListeners() {
    // 이전 달 버튼
    document.getElementById('prev-month').addEventListener('click', () => {
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      renderCalendar(currentDate);
    });
    
    // 다음 달 버튼
    document.getElementById('next-month').addEventListener('click', () => {
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      renderCalendar(currentDate);
    });
    
    // 현재 월로 이동 버튼
    document.getElementById('today-btn').addEventListener('click', () => {
      currentDate = new Date();
      renderCalendar(currentDate);
    });
    
    // 전역 함수로 등록 (다른 스크립트에서 접근 가능하도록)
    window.goToCalendarDate = goToCalendarDate;
    
    // 모달 닫기 버튼
    document.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.style.display = 'none';
        });
      });
    });
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
      document.querySelectorAll('.modal').forEach(modal => {
        if (event.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
    
    // 일정 추가 양식 제출
    document.getElementById('schedule-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      await addSchedule();
    });
    
    // 이전으로 버튼 클릭 시 일정 데이터 로컬 스토리지 저장
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        console.log('이전으로 버튼 클릭 - 일정 데이터 저장');
        saveSchedulesToLocalStorage();
      });
    }
    
    // 페이지 이동 감지 이벤트 처리
    window.addEventListener('beforeunload', function(event) {
      // 페이지를 떠나기 전 일정 데이터를 로컬 스토리지에 저장
      console.log('페이지 이동 감지: 일정 데이터 저장 중...');
      saveSchedulesToLocalStorage();
    });
    
    // 페이지 복귀 감지 이벤트
    window.addEventListener('pageshow', function(event) {
      // bfcache에서 복원된 경우에만 처리 (뒤로가기 등으로 돌아온 경우)
      if (event.persisted) {
        console.log('페이지 복귀 감지: 일정 데이터 복원 시도');
        
        // 로컬 스토리지에서 데이터 복원
        restoreSchedulesFromLocalStorage();
        
        // 달력 다시 렌더링
        renderCalendar(currentDate);
        
        // API에서 새로운 데이터도 가져오기 시도
        getSchedules().catch(err => {
          console.error('페이지 복귀 후 일정 데이터 새로고침 실패:', err);
        });
      }
    });
    
    // visibility change 이벤트를 통한 탭 전환 감지
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        console.log('탭 포커스 복귀: 일정 데이터 복원 시도');
        
        // 탭이 보이게 되었을 때 데이터 복원 시도
        const restored = restoreSchedulesFromLocalStorage();
        
        // 캘린더 업데이트
        renderCalendar(currentDate);
        
        // 최신 데이터도 가져오기 시도
        getSchedules().catch(err => {
          console.error('탭 포커스 복귀 후 일정 데이터 새로고침 실패:', err);
        });
      } else if (document.visibilityState === 'hidden') {
        // 탭이 숨겨질 때 데이터 저장
        console.log('탭 포커스 이탈: 일정 데이터 저장');
        saveSchedulesToLocalStorage();
      }
    });
    
    // 다른 페이지에서 일정 업데이트 이벤트 감지
    if (typeof addScheduleUpdateListener === 'function') {
      addScheduleUpdateListener(function(type, data) {
        console.log(`캘린더: 다른 페이지에서 일정 ${type} 이벤트 수신`, data);
        
        // 캘린더 페이지가 보이는 상태인 경우에만 업데이트
        if (document.visibilityState === 'visible') {
          // 일정 데이터 업데이트
          if (type === 'add') {
            // 이미 존재하는 일정인지 확인
            const existingIndex = schedules.findIndex(s => s.id === data.id);
            if (existingIndex === -1) {
              schedules.push(data);
            } else {
              schedules[existingIndex] = data;
            }
          } else if (type === 'update') {
            const index = schedules.findIndex(s => s.id === data.id);
            if (index !== -1) {
              schedules[index] = data;
            }
          } else if (type === 'delete') {
            schedules = schedules.filter(s => s.id !== data.id);
          }
          
          // 캘린더 다시 렌더링
          renderCalendar(currentDate);
          
          // 로컬 스토리지에 저장
          saveSchedulesToLocalStorage();
        }
      });
    }
  }
  
  // 로딩 표시기 관련 함수
  function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
  }
  
  function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
  
  // 알림 메시지 표시 함수
  function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // 5초 후 자동으로 알림 숨기기
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }
  
  // 필요한 더미 함수들 추가
  async function getCurrentUser() {
    try {
      // 먼저 localStorage에서 사용자 정보 확인
      const storedUser = localStorage.getItem('currentCommittee');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.name) {
          console.log(`localStorage에서 사용자 정보 로드: ${parsedUser.name}`);
          return parsedUser;
        }
      }
      
      // localStorage에 정보가 없는 경우 API 호출 시도
      try {
        const response = await fetch('/auth/current', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.data && data.data.committee) {
            currentUser = data.data.committee;
            // 로컬 스토리지에도 저장
            localStorage.setItem('currentCommittee', JSON.stringify(currentUser));
            console.log(`API에서 사용자 정보 로드: ${currentUser.name}`);
            return currentUser;
          }
        }
      } catch (err) {
        console.warn('API에서 사용자 정보 로드 실패:', err);
      }
      
      // 로컬 스토리지와 API 호출이 모두 실패한 경우만 기본값 사용
      // auth.js에 정의된 글로벌 로그인 사용자 정보 가져오기 시도
      if (typeof window.getCurrentUser === 'function') {
        const authUser = window.getCurrentUser();
        if (authUser) {
          console.log(`auth.js에서 사용자 정보 로드: ${authUser.name}`);
          return authUser;
        }
      }
      
      // 모든 방법이 실패한 경우에만 기본값 설정
      console.warn('사용자 정보를 찾을 수 없어 기본값 사용');
      return {
        id: 'C001',
        name: '신용기',
        role: 'committee'
      };
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
      return {
        id: 'C001',
        name: '신용기',
        role: 'committee'
      };
    }
  }
  
  async function getCommittees() {
    // API 연결이 안되는 경우를 위한 임시 더미 데이터
    committees = [
      { id: 'C001', name: '신용기' },
      { id: 'C002', name: '문일지' },
      { id: 'C003', name: '김수연' },
      { id: 'C004', name: '이연숙' },
      { id: 'C005', name: '이정혜' }
    ];
    return committees;
  }
  
  async function getOrganizations() {
    // API 연결이 안되는 경우를 위한 임시 더미 데이터
    if (window.allOrganizations && window.allOrganizations.length > 0) {
      organizations = window.allOrganizations;
    } else {
      organizations = [
        { code: 'A48250007', name: '김해돌봄지원센터', region: '김해시' },
        { code: 'A48250004', name: '김해시종합사회복지관', region: '김해시' },
        { code: 'A48250006', name: '보현행정노인통합지원센터', region: '김해시' },
        { code: 'A48250005', name: '생명의전화노인통합지원센터', region: '김해시' },
        { code: 'A48250001', name: '효동원노인통합지원센터', region: '김해시' },
        { code: 'A48720001', name: '의령노인통합지원센터', region: '의령군' },
        { code: 'A48740001', name: '사회적협동조합 창녕지역지활센터', region: '창녕군' },
        { code: 'A48740002', name: '창녕군새누리노인종합센터', region: '창녕군' },
        { code: 'A48120008', name: '경남노인통합지원센터', region: '창원시' },
        { code: 'A48120011', name: '창원사회적협동조합', region: '창원시' },
        { code: 'A48120013', name: '진해노인종합복지관', region: '창원시' },
        { code: 'A48120012', name: '진해서부노인종합복지관', region: '창원시' },
        { code: 'A48120004', name: '명진노인통합지원센터', region: '창원시 마산합포구' },
        { code: 'A48120006', name: '성로노인통합지원센터', region: '창원시 의창구' },
        { code: 'A48120001', name: '동진노인통합지원센터', region: '창원시 의창구' },
        { code: 'A48730001', name: '대한노인회함안군지회', region: '함안군' },
        { code: 'A48730002', name: '함안군재가노인통합지원센터', region: '함안군' }
      ];
    }
    return organizations;
  }
  
  // 위원별 색상 매핑을 중앙에서 관리하는 객체 (단일 소스)
  const COMMITTEE_COLORS = {
    // 기본 위원 색상 (항상 일관된 색상 유지)
    '김수연': '#FFCC00', // 노란색
    '이연숙': '#33CC66', // 녹색
    '이정혜': '#9933CC', // 보라색
    '문일지': '#FF3366', // 분홍색
    '신용기': '#3366FF', // 파란색
    // 추가 ID 기반 매핑
    'C001': '#3366FF', // 신용기
    'C002': '#FF3366', // 문일지
    'C003': '#FFCC00', // 김수연
    'C004': '#33CC66', // 이연숙
    'C005': '#9933CC'  // 이정혜
  };
  
  // ID와 이름 기반 매핑을 생성하는 함수
  function generateColorMapping() {
    const colorMapping = {};
    
    // 기본 이름 매핑
    Object.keys(COMMITTEE_COLORS).forEach(name => {
      colorMapping[name] = COMMITTEE_COLORS[name];
      
      // ID 기반 매핑 추가 ('C' 접두사)
      colorMapping[`C${name}`] = COMMITTEE_COLORS[name];
      
      // 대문자 이름 매핑
      colorMapping[name.toUpperCase()] = COMMITTEE_COLORS[name];
    });
    
    // 번호 기반 매핑 (ID가 숫자인 경우)
    Object.entries(committeeNameMapping).forEach(([num, name]) => {
      if (COMMITTEE_COLORS[name]) {
        const numValue = num.replace(/\D/g, '');
        colorMapping[`C${numValue}`] = COMMITTEE_COLORS[name];
        colorMapping[numValue] = COMMITTEE_COLORS[name];
      }
    });
    
    return colorMapping;
  }
  
  // 위원별 색상 매핑 추가 (기존 코드 대체)
  const committeeColors = generateColorMapping();
  
  // 동적 색상 배열 (위원 ID에 매핑된 색상이 없을 때 사용)
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
  
  // 위원 ID로 색상 가져오기
  function getCommitteeColor(committeeId) {
    if (!committeeId) return defaultColor;
    
    // 문자열로 변환
    const idStr = String(committeeId);
    
    // 디버깅 로그
    console.log(`색상 요청 - ID: ${idStr}`);
    
    // 이미 매핑된 색상이 있으면 반환
    if (committeeColors[idStr]) {
      console.log(`직접 매핑 발견: ${idStr} -> ${committeeColors[idStr]}`);
      return committeeColors[idStr];
    }
    
    // 'C' 접두사가 없는 경우 추가해서 확인
    if (!idStr.startsWith('C') && committeeColors[`C${idStr}`]) {
      console.log(`C접두사 추가 매핑 발견: C${idStr} -> ${committeeColors[`C${idStr}`]}`);
      return committeeColors[`C${idStr}`];
    }
    
    // 'C' 접두사가 있는 경우 제거해서 확인
    if (idStr.startsWith('C') && committeeColors[idStr.substring(1)]) {
      console.log(`C접두사 제거 매핑 발견: ${idStr.substring(1)} -> ${committeeColors[idStr.substring(1)]}`);
      return committeeColors[idStr.substring(1)];
    }
    
    // ID가 숫자로만 구성된 경우 C00x 형식으로 시도
    if (/^\d+$/.test(idStr)) {
      const paddedId = `C${idStr.padStart(3, '0')}`;
      if (committeeColors[paddedId]) {
        console.log(`패딩된 ID 매핑 발견: ${paddedId} -> ${committeeColors[paddedId]}`);
        return committeeColors[paddedId];
      }
    }
    
    // 위원 이름으로 확인 (ID가 이름일 수 있음)
    const matchedName = Object.keys(COMMITTEE_COLORS).find(name => 
      idStr.includes(name) || name.includes(idStr)
    );
    if (matchedName) {
      console.log(`이름 포함 매핑 발견: ${matchedName} -> ${COMMITTEE_COLORS[matchedName]}`);
      return COMMITTEE_COLORS[matchedName];
    }
    
    // 이미 동적으로 할당된 색상이 있으면 반환
    if (dynamicColors[idStr]) {
      console.log(`동적 할당 색상 발견: ${idStr} -> ${dynamicColors[idStr]}`);
      return dynamicColors[idStr];
    }
    
    // 관리자는 기본 색상 사용
    if (idStr === 'MASTER' || idStr === '관리자' || idStr === 'C관리자') {
      return defaultColor;
    }
    
    // 새로운 위원 ID에는 색상 팔레트에서 동적으로 색상 할당
    const colorIndex = Object.keys(dynamicColors).length % colorPalette.length;
    dynamicColors[idStr] = colorPalette[colorIndex];
    console.log(`새 색상 동적 할당: ${idStr} -> ${dynamicColors[idStr]}`);
    
    return dynamicColors[idStr];
  }
  
  // 일정 데이터 로드 함수 개선
  async function getSchedules() {
    try {
      console.log('일정 데이터 로드 시도...');
      
      // 현재 날짜 기준으로 월 범위 계산
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 0-indexed to 1-indexed
      
      // 현재 달의 시작일과 끝일
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
      
      // API 엔드포인트 목록 (가능한 여러 형태 시도)
      let endpoints = [
        `/api/schedules/date-range?startDate=${startDate}&endDate=${endDate}`,
        `/api/schedules?startDate=${startDate}&endDate=${endDate}`,
        `/api/schedules/all`
      ];
      
      // 관리자가 아닌 일반 위원이라도 모든 일정을 불러옴 (색상 구분을 위해)
      if (currentUser && currentUser.role !== 'master' && currentUser.id) {
        console.log(`위원 ${currentUser.name}(${currentUser.id})의 일정 포함 모든 일정 로드 시도`);
      }
      
      let schedulesData = null;
      
      // 각 엔드포인트 시도
      for (const endpoint of endpoints) {
        try {
          console.log(`일정 API 엔드포인트 시도: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.status === 'success' && result.data && result.data.schedules) {
              console.log(`일정 API 호출 성공 (${endpoint}): ${result.data.schedules.length}개 일정`);
              schedulesData = result.data.schedules;
              // 일정 데이터 샘플 및 위원 ID를 확인하기 위한 로그 추가
              if (schedulesData.length > 0) {
                console.log('일정 데이터 샘플:', schedulesData.slice(0, 3));
                // 고유한 위원 ID 목록 출력
                const committeeIds = [...new Set(schedulesData.map(s => s.committeeId))];
                console.log('고유 위원 ID 목록:', committeeIds);
              }
              break; // 성공하면 루프 종료
            } else {
              console.warn(`일정 API 응답은 성공했지만 데이터가 유효하지 않음 (${endpoint})`);
            }
          } else {
            console.warn(`일정 API 응답 오류 (${endpoint}): ${response.status}`);
          }
        } catch (err) {
          console.warn(`일정 API 호출 실패 (${endpoint}):`, err);
        }
      }
      
      // API 호출 결과가 있으면 사용
      if (schedulesData && schedulesData.length > 0) {
        // 필터링하지 않고 모든 일정 표시
        console.log(`모든 위원의 일정 ${schedulesData.length}개 표시 준비`);
          
        // 기존 로컬 스토리지 일정과 병합
        const localSchedules = JSON.parse(localStorage.getItem(LOCAL_STORAGE_SCHEDULES_KEY) || '[]');
        
        // API 응답 필드 표준화
        const standardizedApiSchedules = schedulesData.map(schedule => {
          // 표준화된 일정 데이터 생성
          const standardized = {
            ...schedule,
            // 필드 표준화 (일정을 볼 때 다양한 필드 이름 지원)
            scheduleDate: schedule.scheduleDate || schedule.visitDate || schedule.date || schedule.startDate,
            title: schedule.title || (schedule.orgName ? `${schedule.orgName} 방문 일정` : (schedule.orgCode ? `${schedule.orgCode} 방문 일정` : '제목 없음')),
            status: schedule.status || 'pending',
            // 위원 이름이 '모니터링위원N' 형식이면 실제 이름으로 변환
            committeeName: schedule.committeeName ? mapCommitteeName(schedule.committeeName) : schedule.committeeName
          };
          
          // 색상 적용을 위한 위원 ID 확인 및 색상 할당
          if (schedule.committeeId) {
            // 위원 ID가 문자열인지 확인
            const committeeIdStr = String(schedule.committeeId);
            // 위원 ID 정규화 (대소문자 구분 없이 prefix를 고려)
            let normalizedId = committeeIdStr;
            
            // 'C' 접두사가 없으면 추가
            if (!committeeIdStr.startsWith('C')) {
              normalizedId = `C${committeeIdStr}`;
            }
            
            // 실제 사용된 ID와 정규화된 ID 로그 출력
            console.log(`일정 ID ${schedule.id}의 위원 ID: ${committeeIdStr}, 정규화: ${normalizedId}`);
            
            // 정규화된 ID로 색상 할당 - 직접 함수 호출
            standardized.color = getCommitteeColor(normalizedId);
            console.log(`일정 색상 할당: ${standardized.color} (ID: ${normalizedId})`);
          } else if (schedule.committeeName) {
            // 위원 ID가 없지만 이름이 있는 경우 이름으로 색상 찾기
            standardized.color = getCommitteeColor(schedule.committeeName);
            console.log(`이름으로 일정 색상 할당: ${standardized.color} (이름: ${schedule.committeeName})`);
          } else {
            // 위원 ID가 없으면 기본 색상 사용
            standardized.color = defaultColor;
          }
          
          return standardized;
        });
        
        // 서버에서 가져온 데이터와 로컬 데이터 병합 (로컬 데이터 우선, 하지만 서버 데이터 인덱스 유지)
        const mergedSchedules = [...standardizedApiSchedules];
        
        // 로컬에만 있는 일정 (예: 오프라인에서 추가한 일정) 추가
        localSchedules.forEach(localSchedule => {
          // 로컬 일정이 API 응답에 없는 경우만 추가 (id로 비교)
          const existsInApi = standardizedApiSchedules.some(apiSchedule => 
            apiSchedule.id === localSchedule.id
          );
          
          if (!existsInApi) {
            // 임시 ID(local_로 시작)이거나 서버에 없는 일정인 경우 추가
            if (localSchedule.id.toString().startsWith('local_')) {
              console.log('로컬에만 있는 일정 추가:', localSchedule);
              // 위원 이름이 '모니터링위원N' 형식이면 실제 이름으로 변환
              if (localSchedule.committeeName) {
                localSchedule.committeeName = mapCommitteeName(localSchedule.committeeName);
              }
              
              // 위원 ID 정규화 및 색상 적용
              if (localSchedule.committeeId) {
                const committeeIdStr = String(localSchedule.committeeId);
                const normalizedId = committeeIdStr.startsWith('C') 
                  ? committeeIdStr 
                  : `C${committeeIdStr}`;
                
                localSchedule.color = getCommitteeColor(normalizedId);
              } else {
                localSchedule.color = defaultColor;
              }
              
              mergedSchedules.push(localSchedule);
            }
          }
        });
        
        schedules = mergedSchedules;
        console.log(`최종 병합된 일정 데이터: ${schedules.length}개`);
        
        // 색상이 적용된 일정 데이터 샘플 로그 출력
        console.log('색상이 적용된 일정 데이터 샘플:', schedules.slice(0, 3));
        
        // 로컬 스토리지에 백업
        saveSchedulesToLocalStorage();
      } else if (schedules.length === 0) {
        // API와 메모리 모두에 데이터가 없는 경우 로컬 스토리지에서 복원 시도
        const restored = restoreSchedulesFromLocalStorage();
        
        if (!restored) {
          console.warn('모든 데이터 소스에서 일정을 불러올 수 없습니다. 더미 데이터 사용');
          // 더미 데이터 (API와 로컬 스토리지 모두 실패한 경우만)
          schedules = [
            { id: 1, scheduleDate: '2023-08-10', title: '동진노인통합지원센터 방문', committeeId: 'C001', committeeName: '신용기', orgCode: 'A48120001', orgName: '동진노인통합지원센터', status: 'completed', color: getCommitteeColor('C001') },
            { id: 2, scheduleDate: '2023-08-15', title: '김해돌봄지원센터 회의', committeeId: 'C002', committeeName: '문일지', orgCode: 'A48250007', orgName: '김해돌봄지원센터', status: 'pending', color: getCommitteeColor('C002') },
            { id: 3, scheduleDate: '2023-08-20', title: '사회적협동조합 창녕지역지활센터 평가', committeeId: 'C003', committeeName: '김수연', orgCode: 'A48740001', orgName: '사회적협동조합 창녕지역지활센터', status: 'pending', color: getCommitteeColor('C003') }
          ];
        } else {
          // 로컬 스토리지에서 복원한 경우에도 색상 추가
          schedules = schedules.map(schedule => {
            // 위원 ID 정규화 및 색상 적용
            if (schedule.committeeId) {
              const committeeIdStr = String(schedule.committeeId);
              const normalizedId = committeeIdStr.startsWith('C') 
                ? committeeIdStr 
                : `C${committeeIdStr}`;
              
              return {
                ...schedule,
                color: getCommitteeColor(normalizedId)
              };
            } else {
              return {
                ...schedule,
                color: defaultColor
              };
            }
          });
        }
      }
      
      // 달력 다시 렌더링
      renderCalendar(currentDate);
      
      return schedules;
      
    } catch (error) {
      console.error('일정 데이터 로드 중 오류:', error);
      
      // 오류 발생 시 로컬 스토리지에서 복원 시도
      if (schedules.length === 0) {
        restoreSchedulesFromLocalStorage();
        
        // 색상 추가
        schedules = schedules.map(schedule => {
          // 위원 ID 정규화 및 색상 적용
          if (schedule.committeeId) {
            const committeeIdStr = String(schedule.committeeId);
            const normalizedId = committeeIdStr.startsWith('C') 
              ? committeeIdStr 
              : `C${committeeIdStr}`;
            
            return {
              ...schedule,
              color: getCommitteeColor(normalizedId)
            };
          } else {
            return {
              ...schedule,
              color: defaultColor
            };
          }
        });
      }
      
      return schedules;
    }
  }
  
  function updateCommitteeDropdown() {
    const select = document.getElementById('schedule-committee');
    if (!select) return;
    
    // 기존 옵션 제거
    select.innerHTML = '';
    
    // 빈 옵션 추가
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- 위원 선택 --';
    select.appendChild(emptyOption);
    
    // 위원 목록 옵션 추가
    committees.forEach(committee => {
      const option = document.createElement('option');
      option.value = committee.id;
      option.textContent = committee.name;
      select.appendChild(option);
    });
    
    // 현재 사용자가 위원인 경우 자동 선택 및 disabled 처리
    if (currentUser && currentUser.role !== 'master' && currentUser.id) {
      select.value = currentUser.id;
      select.disabled = true; // 선택 비활성화
    }
  }
  
  function updateOrganizationDropdown() {
    try {
      const organizationSelect = document.getElementById('schedule-organization');
      
      if (!organizationSelect) {
        console.error('기관 선택 드롭다운을 찾을 수 없습니다.');
        return;
      }
      
      // 현재 선택된 값 저장
      const selectedValue = organizationSelect.value;
      
      // 드롭다운 초기화
      organizationSelect.innerHTML = '<option value="">기관 선택</option>';
      
      // 지역 그룹별로 기관 정렬
      const groupedOrgs = {};
      
      // 현재 위원(일반 사용자)의 매칭된 기관 코드 목록
      let matchedOrgCodes = [];
      
      // 일반 위원 사용자인 경우 매칭된 기관만 표시
      if (currentUser && currentUser.role !== 'master') {
        console.log('현재 위원 정보:', currentUser);
        
        // JWT 토큰에서 조직 정보 가져오기 시도
        if (currentUser.organizations && currentUser.organizations.mainOrgs) {
          matchedOrgCodes = currentUser.organizations.mainOrgs.map(org => org.code);
          console.log(`JWT 토큰에서 추출한 위원 ${currentUser.name}의 담당 기관 (${matchedOrgCodes.length}개):`, matchedOrgCodes);
        }
        // JWT에 정보가 없는 경우 기존 방식대로 시도
        else if (window.allMatchings) {
          // 사용자 ID 변형 (여러 가능한 ID 형식 처리)
          const userIdVariations = [];
          
          // 원시 ID 형식 추가
          if (currentUser.id) {
            userIdVariations.push(currentUser.id);
            
            // C 접두사 있는 경우 제거, 없는 경우 추가
            if (currentUser.id.startsWith('C')) {
              userIdVariations.push(currentUser.id.substring(1));
            } else {
              userIdVariations.push(`C${currentUser.id}`);
            }
            
            // 이름 기반 ID 형식 (C + 이름) 추가
            if (currentUser.name) {
              userIdVariations.push(`C${currentUser.name}`);
            }
          }
          
          console.log('위원 ID 변형:', userIdVariations);
          console.log('모든 매칭 데이터:', window.allMatchings);
          
          // 현재 사용자의 매칭 정보 필터링
          const userMatchings = window.allMatchings.filter(match => {
            // ID로 매칭 시도
            const idMatched = userIdVariations.some(id => 
              match.committeeId === id || 
              match.committeeId === id.replace(/^C/, '') || 
              match.committeeId === `C${id}`
            );
            
            // 이름으로 매칭 시도
            const nameMatched = currentUser.name && match.committeeName === currentUser.name;
            
            return idMatched || nameMatched;
          });
          
          console.log(`위원 ${currentUser.name}의 매칭 정보:`, userMatchings);
          
          // 매칭된 기관 코드 추출 (중복 제거)
          matchedOrgCodes = [...new Set(userMatchings.map(match => match.orgCode))];
          
          console.log(`위원 ${currentUser.name}의 담당 기관 (${matchedOrgCodes.length}개):`, matchedOrgCodes);
        }
      }
      
      // 관리자인 경우 모든 기관 표시, 일반 위원은 매칭된 기관만 표시
      const filteredOrgs = currentUser && currentUser.role !== 'master' && matchedOrgCodes.length > 0
        ? organizations.filter(org => matchedOrgCodes.includes(org.code))
        : organizations;
      
      // 기관 정보 정렬
      filteredOrgs.forEach(org => {
        const region = org.region || '기타';
        if (!groupedOrgs[region]) {
          groupedOrgs[region] = [];
        }
        groupedOrgs[region].push(org);
      });
      
      // 지역별로 옵션 그룹 생성
      Object.keys(groupedOrgs).sort().forEach(region => {
        const optGroup = document.createElement('optgroup');
        optGroup.label = region;
        
        // 각 지역 내 기관을 이름 순으로 정렬
        groupedOrgs[region].sort((a, b) => a.name.localeCompare(b.name)).forEach(org => {
          const option = document.createElement('option');
          option.value = org.code;
          option.textContent = `${org.name} - ${org.code}`;
          
          // 이전에 선택된 값이면 선택 상태로 설정
          if (selectedValue && selectedValue === org.code) {
            option.selected = true;
          }
          
          optGroup.appendChild(option);
        });
        
        organizationSelect.appendChild(optGroup);
      });
      
      // 선택된 값이 있는 경우
      if (selectedValue) {
        // 선택한 항목으로 스크롤
        for (let i = 0; i < organizationSelect.options.length; i++) {
          if (organizationSelect.options[i].value === selectedValue) {
            organizationSelect.options[i].selected = true;
            break;
          }
        }
      } 
      // 선택된 값이 없고, 일반 위원이면서 매칭된 기관이 있는 경우, 첫 번째 매칭 기관 자동 선택
      else if (currentUser && currentUser.role !== 'master' && matchedOrgCodes.length > 0) {
        // 첫 번째 매칭된 기관 선택
        for (let i = 0; i < organizationSelect.options.length; i++) {
          if (organizationSelect.options[i].value && matchedOrgCodes.includes(organizationSelect.options[i].value)) {
            organizationSelect.options[i].selected = true;
            console.log(`위원 ${currentUser.name}의 첫 번째 담당 기관 자동 선택: ${organizationSelect.options[i].value}`);
            break;
          }
        }
      }
      
      console.log('기관 드롭다운 업데이트 완료');
    } catch (error) {
      console.error('기관 드롭다운 업데이트 중 오류:', error);
    }
  }
  
  function showDateSchedules(dateString) {
    try {
      // 먼저 모든 다른 모달 닫기
      document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id !== 'schedules-list-modal') {
          modal.style.display = 'none';
        }
      });
      
      // 모달 요소 가져오기
      const modal = document.getElementById('schedules-list-modal');
      const modalTitle = document.getElementById('schedules-list-modal-title');
      const schedulesList = document.getElementById('schedules-list');
      
      if (!modal || !modalTitle || !schedulesList) {
        console.error('일정 목록 모달 요소를 찾을 수 없습니다.');
        return;
      }
      
      // 모달 제목 설정
      modalTitle.textContent = `${dateString} 일정 목록`;
      
      // 일정 목록 비우기
      schedulesList.innerHTML = '';
      
      // 해당 날짜의 일정 필터링
      const dateSchedules = schedules.filter(schedule => {
        const scheduleDate = schedule.scheduleDate || schedule.date || schedule.startDate;
        return scheduleDate === dateString;
      });
      
      // 일정이 없으면 메시지 표시
      if (dateSchedules.length === 0) {
        schedulesList.innerHTML = '<div class="empty-message">이 날짜에 등록된 일정이 없습니다.</div>';
      }
      
      // 일정 목록 생성
      dateSchedules.forEach(schedule => {
        const scheduleItem = document.createElement('div');
        scheduleItem.classList.add('schedule-item');
        
        // 일정 상태에 따른 스타일 추가
        if (schedule.status === 'completed') {
          scheduleItem.classList.add('completed');
        } else if (schedule.status === 'pending') {
          scheduleItem.classList.add('pending');
        }
        
        // 표시할 위원 이름 결정
        let displayCommitteeName = schedule.committeeName || '';
        
        // 현재 로그인 사용자와 일정의 위원 ID가 일치하면 현재 사용자 이름 사용
        if (currentUser && schedule.committeeId === currentUser.id) {
          displayCommitteeName = currentUser.name;
        }
        
        // 일정 내용 구성
        scheduleItem.innerHTML = `
          <div class="schedule-title">${schedule.title || (schedule.orgName ? `${schedule.orgName} 방문 일정` : '제목 없음')}</div>
          <div class="schedule-info">
            <span class="committee">${displayCommitteeName}</span>
            <span class="org">${schedule.orgName || '기관 미지정'}</span>
          </div>
        `;
        
        // 일정 클릭 이벤트
        scheduleItem.addEventListener('click', () => {
          // 일정 상세 정보 표시 함수 호출
          showScheduleDetails(schedule);
        });
        
        schedulesList.appendChild(scheduleItem);
      });
      
      // 새 일정 추가 버튼
      const addButton = document.createElement('button');
      addButton.classList.add('btn', 'add-schedule-btn');
      addButton.textContent = '새 일정 추가';
      addButton.addEventListener('click', () => {
        modal.style.display = 'none';
        showAddScheduleModal(dateString);
      });
      
      schedulesList.appendChild(addButton);
      
      // 모달 표시
      modal.style.display = 'block';
    } catch (error) {
      console.error('일정 목록 표시 중 오류:', error);
      showNotification('일정 목록을 표시하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  // 일정 상세 정보 표시 함수 추가
  function showScheduleDetails(schedule) {
    try {
      // 먼저 모든 모달 닫기
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
      
      // 일정 상세 모달 요소 가져오기
      const modal = document.getElementById('schedule-detail-modal');
      const modalTitle = document.getElementById('schedule-detail-title');
      const detailContent = document.getElementById('schedule-detail-content');
      
      if (!modal || !modalTitle || !detailContent) {
        console.error('일정 상세 모달 요소를 찾을 수 없습니다.');
        return;
      }
      
      // 모달 제목 설정
      modalTitle.textContent = schedule.title || (schedule.orgName ? `${schedule.orgName} 방문 일정` : '제목 없음');
      
      // 일정 상세 내용 구성
      let statusText = '대기중';
      let statusClass = 'pending';
      
      if (schedule.status === 'completed') {
        statusText = '완료됨';
        statusClass = 'completed';
      } else if (schedule.status === 'canceled') {
        statusText = '취소됨';
        statusClass = 'canceled';
      }
      
      // 표시할 위원 이름 결정
      let displayCommitteeName = schedule.committeeName || '';
      
      // 현재 로그인 사용자와 일정의 위원 ID가 일치하면 현재 사용자 이름 사용
      if (currentUser && schedule.committeeId === currentUser.id) {
        displayCommitteeName = currentUser.name;
      }
      
      // 상세 내용 HTML 구성
      detailContent.innerHTML = `
        <div class="detail-row">
          <div class="detail-label">일정 날짜:</div>
          <div class="detail-value">${schedule.scheduleDate || schedule.date || schedule.startDate || '날짜 정보 없음'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">담당 위원:</div>
          <div class="detail-value committee-name" style="color: ${schedule.color || defaultColor};">${displayCommitteeName || '위원 정보 없음'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">담당 기관:</div>
          <div class="detail-value">${schedule.orgName || '기관 정보 없음'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">상태:</div>
          <div class="detail-value status ${statusClass}">${statusText}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">설명:</div>
          <div class="detail-value description">${schedule.description || '설명 없음'}</div>
        </div>
      `;
      
      // 수정/삭제 버튼 추가
      const buttonsContainer = document.createElement('div');
      buttonsContainer.classList.add('detail-buttons');
      
      // 상태 변경 버튼
      const statusButton = document.createElement('button');
      statusButton.classList.add('btn', 'status-btn');
      
      if (schedule.status === 'pending') {
        statusButton.textContent = '완료로 변경';
        statusButton.classList.add('complete-btn');
        statusButton.addEventListener('click', () => updateScheduleStatus(schedule.id, 'completed'));
      } else if (schedule.status === 'completed') {
        statusButton.textContent = '대기로 변경';
        statusButton.classList.add('pending-btn');
        statusButton.addEventListener('click', () => updateScheduleStatus(schedule.id, 'pending'));
      }
      
      // 수정 버튼
      const editButton = document.createElement('button');
      editButton.textContent = '수정';
      editButton.classList.add('btn', 'edit-btn');
      editButton.addEventListener('click', () => {
        // 먼저 현재 모달 닫기
        modal.style.display = 'none';
        // 수정 모달 표시
        showEditScheduleModal(schedule);
      });
      
      // 삭제 버튼
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '삭제';
      deleteButton.classList.add('btn', 'delete-btn');
      deleteButton.addEventListener('click', () => {
        if (confirm('정말 이 일정을 삭제하시겠습니까?')) {
          deleteSchedule(schedule.id);
          modal.style.display = 'none';
        }
      });
      
      buttonsContainer.appendChild(statusButton);
      buttonsContainer.appendChild(editButton);
      buttonsContainer.appendChild(deleteButton);
      
      detailContent.appendChild(buttonsContainer);
      
      // 모달 표시
      modal.style.display = 'block';
    } catch (error) {
      console.error('일정 상세 정보 표시 중 오류:', error);
      showNotification('일정 상세 정보를 표시하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  // 일정 상태 업데이트 함수
  async function updateScheduleStatus(scheduleId, newStatus) {
    try {
      // 해당 일정 찾기
      const scheduleIndex = schedules.findIndex(s => s.id == scheduleId);
      if (scheduleIndex === -1) {
        console.error('일정을 찾을 수 없습니다:', scheduleId);
        showNotification('일정을 찾을 수 없습니다.', 'error');
        return;
      }
      
      // API 호출
      const response = await fetch(`/api/schedules/${scheduleId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      }).catch(err => {
        console.warn('API 호출 실패, 로컬 데이터만 업데이트:', err);
        return { ok: false };
      });
      
      // 로컬 데이터 업데이트
      schedules[scheduleIndex].status = newStatus;
      
      // 모달 닫기
      document.getElementById('schedule-detail-modal').style.display = 'none';
      
      // 달력 업데이트
      renderCalendar(currentDate);
      
      // 로컬 스토리지에 백업
      saveSchedulesToLocalStorage();
      
      // 일정 변경 이벤트 발생
      if (typeof notifyScheduleUpdated === 'function') {
        notifyScheduleUpdated('update', schedules[scheduleIndex]);
      }
      
      // 결과 메시지
      if (response.ok) {
        console.log('일정 상태 업데이트 성공');
        showNotification('일정 상태가 업데이트되었습니다.', 'success');
      } else {
        console.warn('API 호출은 실패했지만, 로컬 데이터는 업데이트되었습니다.');
        showNotification('서버 연결에 문제가 있지만, 화면에는 반영되었습니다.', 'warning');
      }
    } catch (error) {
      console.error('일정 상태 업데이트 중 오류:', error);
      showNotification('일정 상태를 업데이트하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  // 일정 삭제 함수
  async function deleteSchedule(scheduleId) {
    try {
      // 해당 일정 찾기
      const scheduleIndex = schedules.findIndex(s => s.id == scheduleId);
      if (scheduleIndex === -1) {
        console.error('일정을 찾을 수 없습니다:', scheduleId);
        showNotification('일정을 찾을 수 없습니다.', 'error');
        return;
      }
      
      // 일정 정보 저장
      const deletedSchedule = {...schedules[scheduleIndex]};
      
      // 데이터 형식 통일
      deletedSchedule.date = deletedSchedule.scheduleDate || deletedSchedule.visitDate || deletedSchedule.date;
      deletedSchedule.visitDate = deletedSchedule.scheduleDate || deletedSchedule.visitDate || deletedSchedule.date;
      
      // API 호출
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE'
      }).catch(err => {
        console.warn('API 호출 실패, 로컬 데이터만 업데이트:', err);
        return { ok: false };
      });
      
      // 로컬 데이터에서 제거
      schedules.splice(scheduleIndex, 1);
      
      // 모든 모달 닫기
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
      
      // 달력 업데이트
      renderCalendar(currentDate);
      
      // 로컬 스토리지에 백업
      saveSchedulesToLocalStorage();
      
      // 일정 변경 이벤트 발생
      if (typeof notifyScheduleUpdated === 'function') {
        notifyScheduleUpdated('delete', deletedSchedule);
      }
      
      // 마스터 대시보드 데이터 업데이트 이벤트 발생
      if (currentUser && currentUser.role === 'master') {
        console.log('마스터 대시보드 일정 데이터 업데이트 이벤트 발생');
        document.dispatchEvent(new CustomEvent('masterDashboardDataUpdated', {
          detail: { type: 'delete', data: deletedSchedule }
        }));
      }
      
      // 결과 메시지
      if (response.ok) {
        console.log('일정 삭제 성공');
        showNotification('일정이 삭제되었습니다.', 'success');
      } else {
        console.warn('API 호출은 실패했지만, 로컬 데이터는 업데이트되었습니다.');
        showNotification('서버 연결에 문제가 있지만, 화면에는 반영되었습니다.', 'warning');
      }
    } catch (error) {
      console.error('일정 삭제 중 오류:', error);
      showNotification('일정을 삭제하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  // 일정 수정 모달 표시 함수
  function showEditScheduleModal(schedule) {
    try {
      // 모든 모달 닫기
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
      
      // 모달 초기화
      const modal = document.getElementById('schedule-form-modal');
      const modalTitle = document.getElementById('schedule-form-title');
      const form = document.getElementById('schedule-form');
      const saveButton = document.getElementById('save-schedule-btn');
      
      if (!modal || !modalTitle || !form || !saveButton) {
        console.error('일정 수정 모달 요소를 찾을 수 없습니다.');
        return;
      }
      
      // 모달 제목 설정
      modalTitle.textContent = `일정 수정: ${schedule.title || (schedule.orgName ? `${schedule.orgName} 방문 일정` : '제목 없음')}`;
      
      // 양식 초기값 설정
      const scheduleId = document.getElementById('schedule-id');
      const scheduleDate = document.getElementById('schedule-date');
      const scheduleCommittee = document.getElementById('schedule-committee');
      const scheduleOrganization = document.getElementById('schedule-organization');
      const scheduleStartTime = document.getElementById('schedule-start-time');
      const scheduleEndTime = document.getElementById('schedule-end-time');
      const scheduleNotes = document.getElementById('schedule-notes');
      
      // 필드에 데이터 설정
      if (scheduleId) scheduleId.value = schedule.id || '';
      if (scheduleDate) scheduleDate.value = schedule.scheduleDate || schedule.date || schedule.startDate || '';
      if (scheduleCommittee) scheduleCommittee.value = schedule.committeeId || '';
      if (scheduleOrganization) scheduleOrganization.value = schedule.orgCode || '';
      
      // 시간 데이터 설정 (있는 경우)
      if (scheduleStartTime && schedule.startTime) scheduleStartTime.value = schedule.startTime;
      if (scheduleEndTime && schedule.endTime) scheduleEndTime.value = schedule.endTime;
      
      // 메모 설정
      if (scheduleNotes) scheduleNotes.value = schedule.description || schedule.notes || '';
      
      // 제출 버튼 텍스트 변경
      saveButton.textContent = '일정 수정';
      
      // 저장 버튼 이벤트 설정
      // 기존 이벤트 리스너 제거
      const newSaveButton = saveButton.cloneNode(true);
      saveButton.parentNode.replaceChild(newSaveButton, saveButton);
      
      // 새 이벤트 리스너 추가
      newSaveButton.addEventListener('click', async () => {
        await updateSchedule();
      });
      
      // 드롭다운 업데이트
      updateCommitteeDropdown();
      updateOrganizationDropdown();
      
      // 모달 표시
      modal.style.display = 'block';
    } catch (error) {
      console.error('일정 수정 모달 표시 중 오류:', error);
      showNotification('일정 수정 모달을 표시하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  // 일정 업데이트 함수
  async function updateSchedule() {
    try {
      const form = document.getElementById('schedule-form');
      const scheduleId = document.getElementById('schedule-id').value;
      
      if (!scheduleId) {
        showNotification('일정 ID가 유효하지 않습니다.', 'error');
        return;
      }
      
      // 필수 필드 값 가져오기
      const scheduleDate = document.getElementById('schedule-date').value;
      const committeeId = document.getElementById('schedule-committee').value;
      const orgCode = document.getElementById('schedule-organization').value;
      const startTime = document.getElementById('schedule-start-time').value;
      const endTime = document.getElementById('schedule-end-time').value;
      const notes = document.getElementById('schedule-notes').value;
      
      // 필수 필드 검증
      if (!scheduleDate || !committeeId || !orgCode) {
        showNotification('모든 필수 필드를 입력해주세요.', 'error');
        return;
      }
      
      // 위원 목록에서 이름 가져오기
      const committeeSelect = document.getElementById('schedule-committee');
      const committeeName = committeeSelect.options[committeeSelect.selectedIndex].text;
      
      // 기관 목록에서 이름 가져오기
      const orgSelect = document.getElementById('schedule-organization');
      const orgIndex = orgSelect.selectedIndex;
      
      if (orgIndex === -1) {
        showNotification('기관 선택이 올바르지 않습니다.', 'error');
        return;
      }
      
      // 선택된 기관 정보 가져오기
      const orgText = orgSelect.options[orgIndex].text;
      const orgData = orgText.split(' - ');
      const organization = await fetchOrganizationByCode(orgCode);
      
      if (!organization) {
        showNotification('선택된 기관 정보를 찾을 수 없습니다.', 'error');
        return;
      }
      
      console.log('업데이트할 일정 데이터:', { 
        committeeId, 
        committeeName,
        orgCode,
        orgName: organization.name
      });
      
      // 위원별 색상도 포함
      const color = getCommitteeColor(committeeId);
      
      // 업데이트 데이터 구성
      const updateData = {
        committeeId: committeeId,
        committeeName: committeeName,
        orgCode: orgCode,
        orgName: organization.name,
        visitDate: scheduleDate,
        startTime: startTime,
        endTime: endTime,
        notes: notes || '',
        color: color // 색상 정보 추가
      };
      
      // 일정 인덱스 찾기
      const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
      
      if (scheduleIndex === -1) {
        showNotification('해당 일정을 찾을 수 없습니다.', 'error');
        return;
      }
      
      // 기존 일정 데이터 백업
      const originalSchedule = { ...schedules[scheduleIndex] };
      
      // 로컬 데이터 업데이트
      schedules[scheduleIndex] = {
        ...schedules[scheduleIndex],
        committeeId: committeeId,
        orgCode: orgCode,
        committeeName: committeeName,
        orgName: organization.name,
        scheduleDate: scheduleDate,
        startTime: startTime,
        endTime: endTime,
        notes: notes || '',
        title: `${organization.name} 방문 일정`,
        color: color // 색상 정보 추가
      };
      
      // 모든 모달 닫기
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
      
      // 달력 업데이트
      renderCalendar(currentDate);
      
      // 로컬 스토리지에 저장
      saveSchedulesToLocalStorage();
      
      // API 호출로 서버 업데이트
      try {
        const response = await fetch(`/api/schedules/${scheduleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }).catch(err => {
          console.warn('API 호출 실패, 로컬 데이터만 업데이트:', err);
          return { ok: false };
        });
        
        if (response.ok) {
          console.log('일정 업데이트 성공');
          showNotification('일정이 업데이트되었습니다.', 'success');
        } else {
          console.warn('API 호출은 실패했지만, 로컬 데이터는 업데이트되었습니다.');
          showNotification('서버 연결에 문제가 있지만, 화면에는 반영되었습니다.', 'warning');
        }
        
        // 일정 변경 이벤트 발생
        if (typeof notifyScheduleUpdated === 'function') {
          notifyScheduleUpdated('update', schedules[scheduleIndex]);
        }
        
        // 마스터 대시보드 데이터 업데이트 이벤트 발생
        if (currentUser && currentUser.role === 'master') {
          console.log('마스터 대시보드 일정 데이터 업데이트 이벤트 발생 (업데이트)');
          document.dispatchEvent(new CustomEvent('masterDashboardDataUpdated', {
            detail: { type: 'update', data: schedules[scheduleIndex] }
          }));
        }
      } catch (error) {
        console.error('서버 업데이트 중 오류:', error);
        showNotification('서버 통신 중 오류가 발생했지만, 화면에는 반영되었습니다.', 'warning');
      }
    } catch (error) {
      console.error('일정 업데이트 중 오류:', error);
      showNotification('일정을 업데이트하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  async function addSchedule() {
    try {
      const form = document.getElementById('schedule-form');
      
      // 필수 필드 값 가져오기
      const scheduleDate = document.getElementById('schedule-date').value;
      const committeeId = document.getElementById('schedule-committee').value;
      const orgCode = document.getElementById('schedule-organization').value;
      const startTime = document.getElementById('schedule-start-time').value;
      const endTime = document.getElementById('schedule-end-time').value;
      const notes = document.getElementById('schedule-notes').value;
      
      // 필수 필드 검증
      if (!scheduleDate || !committeeId || !orgCode) {
        showNotification('모든 필수 필드를 입력해주세요.', 'error');
        return;
      }
      
      // 클라이언트 전용 데이터 (UI 표시용)
      const localData = {
        scheduleDate: scheduleDate,
        startTime: startTime,
        endTime: endTime,
        committeeId: committeeId,
        orgCode: orgCode,
        description: notes || '',
        status: 'pending'
      }
      
      // 현재 로그인한 사용자 정보 확인 (currentUser 사용)
      if (currentUser && committeeId === currentUser.id) {
        localData.committeeName = currentUser.name;
        console.log(`로그인 사용자 이름으로 설정: ${localData.committeeName}`);
      } else {
        // 선택된 다른 위원인 경우 위원 목록에서 찾기
        const committee = committees.find(c => c.id === committeeId);
        if (committee) {
          // 위원 이름이 '모니터링위원N' 형식인 경우 실제 이름으로 변환
          localData.committeeName = mapCommitteeName(committee.name);
          console.log(`위원 목록에서 이름 찾음: ${localData.committeeName}`);
        } else {
          console.warn(`위원 ID ${committeeId}에 해당하는 위원을 찾을 수 없습니다`);
        }
      }
      
      // 기관 이름 설정
      const organization = organizations.find(o => o.code === orgCode);
      if (organization) {
        localData.orgName = organization.name;
        localData.title = `${organization.name} 방문 일정`;
      } else {
        localData.title = `${orgCode} 방문 일정`;
      }
      
      console.log('최종 일정 데이터:', { 
        committeeId, 
        committeeName: localData.committeeName,
        orgCode,
        orgName: localData.orgName
      });
      
      // 위원별 색상 추가
      localData.color = getCommitteeColor(committeeId);
      
      // 서버로 전송할 API 요청 데이터 구성 (서버 API 형식에 맞춤)
      const requestData = {
        committeeId: committeeId,
        committeeName: localData.committeeName, // 로그인한 사용자 이름 또는 매핑된 실제 이름
        orgCode: orgCode,
        orgName: localData.orgName, // 기관 이름도 명시적으로 전송
        visitDate: scheduleDate,
        startTime: startTime,
        endTime: endTime,
        notes: notes || '',
        title: localData.title, // 제목 필드 추가
        color: localData.color // 색상 정보 추가
      };
      
      console.log('일정 추가 요청 데이터:', requestData);
      
      // API 호출
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      }).catch(err => {
        console.warn('API 호출 실패, 로컬 데이터만 업데이트:', err);
        return { ok: false, status: 503 };
      });
      
      // 서버 응답 처리
      let newScheduleId;
      let apiSuccess = false;
      
      if (response.ok) {
        try {
          const result = await response.json();
          console.log('일정 추가 성공:', result);
          newScheduleId = result.data?.schedule?.id;
          apiSuccess = true;
        } catch (err) {
          console.warn('API 응답 처리 오류:', err);
          newScheduleId = `local_${Date.now()}`;
        }
      } else {
        console.warn('API 호출 실패 상태:', response.status);
        newScheduleId = `local_${Date.now()}`;
      }
      
      // 일정 배열에 추가 (서버에서 반환된 ID 사용 또는 임시 ID 생성)
      const newSchedule = {
        ...localData,
        id: newScheduleId
      };
      schedules.push(newSchedule);
      
      // 모달 닫기
      document.getElementById('schedule-form-modal').style.display = 'none';
      
      // 달력 업데이트
      renderCalendar(currentDate);
      
      // 로컬 스토리지에 백업
      saveSchedulesToLocalStorage();
      
      // 일정 변경 이벤트 발생
      if (typeof notifyReportUpdate === 'function') {
        notifyReportUpdate('add', {
          id: newSchedule.id,
          committeeId: committeeId,
          committeeName: committee ? committee.name : '',
          orgCode: orgCode,
          orgName: organization ? organization.name : '',
          date: scheduleDate,
          visitDate: scheduleDate,
          scheduleDate: scheduleDate,
          startTime: startTime,
          endTime: endTime,
          notes: notes || '',
          title: localData.title, // 제목 필드 추가
          color: localData.color // 색상 정보 추가
        });
      }
      
      // 마스터 대시보드 데이터 업데이트 이벤트 발생
      if (currentUser && currentUser.role === 'master') {
        console.log('마스터 대시보드 일정 데이터 업데이트 이벤트 발생 (일정 추가)');
        document.dispatchEvent(new CustomEvent('masterDashboardDataUpdated', {
          detail: { type: 'add', data: newSchedule }
        }));
      }
      
      if (apiSuccess) {
        showNotification('일정이 추가되었습니다.', 'success');
      } else {
        showNotification('서버 연결에 문제가 있지만, 화면에는 반영되었습니다. 페이지를 새로고침하지 마세요.', 'warning');
      }
    } catch (error) {
      console.error('일정 추가 중 오류:', error);
      showNotification('일정을 추가하는 중 오류가 발생했습니다.', 'error');
    }
  }
  
  // 로컬 스토리지 관련 함수 개선
  function saveSchedulesToLocalStorage() {
    try {
      const schedulesJson = JSON.stringify(schedules);
      localStorage.setItem(LOCAL_STORAGE_SCHEDULES_KEY, schedulesJson);
      localStorage.setItem(LOCAL_STORAGE_LAST_UPDATE_KEY, new Date().toISOString());
      console.log(`일정 데이터 로컬 스토리지 저장 완료: ${schedules.length}개`);
      
      // 전역 객체에 일정 데이터 백업
      window.calendarSchedules = schedules;
      return true;
    } catch (error) {
      console.error('일정 데이터 로컬 스토리지 저장 오류:', error);
      return false;
    }
  }
  
  function restoreSchedulesFromLocalStorage() {
    try {
      // 전역 객체에서 먼저 확인
      if (window.calendarSchedules && window.calendarSchedules.length > 0) {
        console.log(`전역 객체에서 일정 데이터 복원: ${window.calendarSchedules.length}개`);
        schedules = window.calendarSchedules;
        return true;
      }
      
      // 로컬 스토리지에서 확인
      const storedSchedules = localStorage.getItem(LOCAL_STORAGE_SCHEDULES_KEY);
      const lastUpdate = localStorage.getItem(LOCAL_STORAGE_LAST_UPDATE_KEY);
      
      if (storedSchedules) {
        const parsedSchedules = JSON.parse(storedSchedules);
        
        // 로컬 스토리지에 유효한 데이터가 있는 경우
        if (parsedSchedules && parsedSchedules.length > 0) {
          console.log(`로컬 스토리지에서 일정 데이터 복원: ${parsedSchedules.length}개 (마지막 업데이트: ${lastUpdate || '알 수 없음'})`);
          schedules = parsedSchedules;
          
          // 전역 객체에도 저장
          window.calendarSchedules = parsedSchedules;
          return true;
        }
      }
      
      console.log('로컬 스토리지에 유효한 일정 데이터가 없습니다.');
      return false;
    } catch (error) {
      console.error('일정 데이터 로컬 스토리지 복원 오류:', error);
      return false;
    }
  }
  
  // 일정 데이터가 서버로 전송된 후 종합보고서에 알림
  async function notifyReportUpdate(type, scheduleData) {
    try {
      // common.js의 notifyScheduleUpdated 함수 사용
      if (typeof notifyScheduleUpdated === 'function') {
        notifyScheduleUpdated(type, scheduleData);
        console.log(`일정 ${type} 이벤트 발생: 알림 성공`);
      } else {
        // 함수가 없으면 커스텀 이벤트 직접 발생
        console.log(`notifyScheduleUpdated 함수를 찾을 수 없어 직접 이벤트 발생`);
        const event = new CustomEvent('scheduleUpdated', {
          detail: {
            type: type,
            data: scheduleData
          }
        });
        window.dispatchEvent(event);
      }
      
      return true;
    } catch (error) {
      console.error('일정 이벤트 알림 중 오류:', error);
      return false;
    }
  }
  
  // 특정 날짜로 이동하는 함수 추가
  function goToCalendarDate(dateString) {
    try {
      if (!dateString) {
        console.error('날짜 문자열이 제공되지 않았습니다.');
        return;
      }
      
      console.log(`날짜 이동 시도: ${dateString}`);
      
      // 날짜 문자열 파싱 (YYYY-MM-DD 형식)
      const parts = dateString.split('-');
      if (parts.length !== 3) {
        console.error('잘못된 날짜 형식:', dateString);
        return;
      }
      
      // 날짜 객체 생성 (월은 0-based이므로 1 감소)
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-based month
      const day = parseInt(parts[2], 10);
      
      // 유효한 날짜인지 확인
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.error('날짜 변환 오류:', dateString);
        return;
      }
      
      // 해당 월로 이동
      currentDate = new Date(year, month, 1);
      renderCalendar(currentDate);
      
      // 해당 날짜에 시각적 표시 추가 (선택 효과)
      setTimeout(() => {
        const targetCell = document.querySelector(`.calendar-cell[data-date="${dateString}"]`);
        if (targetCell) {
          // 셀에 특별한 스타일 적용
          targetCell.classList.add('target-date');
          
          // 셀로 스크롤
          targetCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // 강조 효과를 잠시 후 제거
          setTimeout(() => {
            targetCell.classList.remove('target-date');
          }, 3000);
          
          // 보고서에서 왔다면 해당 날짜의 일정 목록 표시
          if (localStorage.getItem('calendar_from_report') === 'true') {
            showDateSchedules(dateString);
            localStorage.removeItem('calendar_from_report');
          }
        }
      }, 300);
      
      console.log(`날짜 이동 완료: ${year}년 ${month + 1}월 ${day}일`);
    } catch (error) {
      console.error('날짜 이동 중 오류:', error);
    }
  }
  
  // 달력 스타일 동적 추가
  function addCalendarStyles() {
    // 이미 스타일이 추가되어 있는지 확인
    if (document.getElementById('calendar-dynamic-styles')) {
      return;
    }
    
    // 스타일 요소 생성
    const styleElement = document.createElement('style');
    styleElement.id = 'calendar-dynamic-styles';
    
    // 스타일 정의
    styleElement.textContent = `
      .calendar-cell.target-date {
        animation: pulse-highlight 2s;
        box-shadow: 0 0 0 2px #3b82f6;
        position: relative;
        z-index: 2;
      }
      
      @keyframes pulse-highlight {
        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      }
      
      /* 일정 관련 스타일 */
      .event {
        border-radius: 3px;
        padding: 2px 4px;
        margin-bottom: 3px;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        white-space: nowrap;
        overflow: hidden;
        position: relative;
        background-color: rgba(255, 255, 255, 0.9);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .event:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        z-index: 5;
      }
      
      .event.my-event {
        background-color: rgba(240, 249, 255, 0.95);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      
      .event-title {
        max-width: 70%;
        overflow: hidden;
        text-overflow: ellipsis;
        z-index: 1;
        position: relative;
      }
      
      .event-committee {
        color: #666;
        z-index: 1;
        position: relative;
        border-radius: 3px;
        padding: 0 3px;
        font-size: 0.7rem;
      }
      
      .committee-indicator {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        width: 10px;
        height: 10px;
        border-radius: 50%;
        opacity: 0.9;
        box-shadow: 0 0 2px rgba(0,0,0,0.2);
      }
      
      /* 일정 목록 스타일 */
      .schedule-item {
        border-radius: 4px;
        padding: 8px 10px;
        margin-bottom: 8px;
        background-color: #f9f9f9;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      }
      
      .schedule-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      }
      
      .schedule-item.my-schedule {
        background-color: #f0f9ff;
      }
      
      /* 일정 상태 관련 스타일 */
      .completed {
        opacity: 0.7;
      }
      
      .pending {
        font-weight: normal;
      }
      
      /* 색상 구분 레전드 (범례) */
      #committee-color-legend {
        margin-top: 10px;
        padding: 10px;
        border-radius: 6px;
        background-color: #f0f7ff;
        border: 1px solid #d1e3fa;
        display: flex;
        flex-direction: column;
      }
      
      .legend-items-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .legend-title {
        margin-right: 15px;
        margin-bottom: 8px;
        font-weight: bold;
        font-size: 0.9rem;
        color: #1e40af;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        margin-right: 12px;
        margin-bottom: 4px;
        font-size: 0.8rem;
        padding: 4px 8px;
        border-radius: 4px;
      }
      
      .legend-item.current-user {
        background-color: #e0f2fe;
        font-weight: bold;
      }
      
      .color-box {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        display: inline-block;
        border-radius: 3px;
        border: 1px solid rgba(0,0,0,0.1);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      
      .color-sample {
        margin-left: 5px;
        padding: 2px 8px;
        border-radius: 2px;
        font-size: 0.7rem;
        color: #444;
      }
    `;
    
    // 문서 헤드에 스타일 요소 추가
    document.head.appendChild(styleElement);
    console.log('캘린더 동적 스타일 추가 완료');
    
    // 범례(레전드) 추가
    addCommitteeLegend();
  }
  
  // 위원별 색상 범례(레전드) 추가
  function addCommitteeLegend() {
    setTimeout(() => {
      // 캘린더 상단에 범례 추가
      const calendarHeader = document.querySelector('.calendar-header');
      if (!calendarHeader) return;
      
      // 기존 범례 있으면 제거
      const existingLegend = document.getElementById('committee-color-legend');
      if (existingLegend) existingLegend.remove();
      
      // 범례 컨테이너 생성
      const legend = document.createElement('div');
      legend.id = 'committee-color-legend';
      
      // 범례 제목
      const legendTitle = document.createElement('div');
      legendTitle.textContent = '위원별 색상 구분';
      legendTitle.classList.add('legend-title');
      legend.appendChild(legendTitle);
      
      // 범례 항목을 담을 컨테이너
      const legendItemsContainer = document.createElement('div');
      legendItemsContainer.classList.add('legend-items-container');
      legend.appendChild(legendItemsContainer);
      
      // 현재 사용자 먼저 추가
      if (currentUser) {
        const currentUserItem = createLegendItem(currentUser.id, currentUser.name, true);
        legendItemsContainer.appendChild(currentUserItem);
      }
      
      // 위원 순서 정렬을 위한 목록
      const committeeOrder = ['김수연', '이연숙', '이정혜', '문일지', '신용기'];
      
      // 위원별 색상 항목 추가 (지정된 순서대로)
      committeeOrder.forEach(committeeName => {
        // 이미 현재 사용자로 추가된 경우 건너뛰기
        if (currentUser && currentUser.name === committeeName) {
          return;
        }
        
        const committee = committees.find(c => c.name === committeeName);
        if (committee) {
          const legendItem = createLegendItem(committee.id, committee.name);
          legendItemsContainer.appendChild(legendItem);
        }
      });
      
      // 범례 추가
      calendarHeader.appendChild(legend);
    }, 500); // 다른 요소들이 렌더링된 후 추가
  }
  
  // 범례 항목 생성 헬퍼 함수
  function createLegendItem(committeeId, committeeName, isCurrentUser = false) {
    const legendItem = document.createElement('div');
    legendItem.classList.add('legend-item');
    if (isCurrentUser) {
      legendItem.classList.add('current-user');
    }
    
    const colorBox = document.createElement('span');
    colorBox.classList.add('color-box');
    colorBox.style.backgroundColor = getCommitteeColor(committeeId);
    
    const nameLabel = document.createElement('span');
    nameLabel.textContent = committeeName;
    
    // 색상 견본 배경으로 보여주기
    const sampleBackground = document.createElement('span');
    sampleBackground.classList.add('color-sample');
    sampleBackground.style.backgroundColor = `${getCommitteeColor(committeeId)}20`;
    sampleBackground.textContent = '예시';
    
    legendItem.appendChild(colorBox);
    legendItem.appendChild(nameLabel);
    legendItem.appendChild(sampleBackground);
    
    return legendItem;
  }
  
  // 초기화 함수 호출
  initialize();
});