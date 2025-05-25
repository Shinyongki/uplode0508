// 인증 관련 함수들

let isAuthenticated = true; // 기본적으로 인증됨으로 설정
window.currentUser = {
  name: '마스터',
  role: 'master',
  id: 'C001',
  isAdmin: true
};
let authToken = 'dummy-token-for-development';

// 토큰 관리
const setToken = (token) => {
  if (!token) {
    console.warn('토큰이 없습니다.');
    return;
  }
  
  // 토큰이 유효한지 간단한 검증
  if (token.length < 10) {
    console.warn('유효하지 않은 토큰 형식입니다:', token);
    return;
  }
  
  authToken = token;
  localStorage.setItem('authToken', token);
  console.log('인증 토큰 저장됨');
  
  // 토큰 설정 완료 이벤트 발생 - 다른 스크립트에서 감지 가능
  const tokenEvent = new CustomEvent('auth:token-ready', { detail: { token } });
  document.dispatchEvent(tokenEvent);
};

const getToken = () => {
  if (!authToken || authToken === 'dummy-token-for-development') {
    // 로컬 스토리지에서 토큰 복구 시도
    const storedToken = localStorage.getItem('authToken');
    if (storedToken && storedToken !== 'dummy-token-for-development') {
      authToken = storedToken;
      console.log('토큰 복구: 성공');
    } else {
      console.log('토큰 복구: 없음 또는 더미 토큰');
    }
  }
  return authToken;
};

const removeToken = () => {
  authToken = null;
  localStorage.removeItem('authToken');
  console.log('인증 토큰 제거됨');
  
  // 토큰 제거 이벤트 발생
  document.dispatchEvent(new Event('auth:token-removed'));
};

// 인증 헤더 가져오기
const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token && token !== 'dummy-token-for-development' ? `Bearer ${token}` : ''
  };
};

// 현재 사용자 정보 가져오기
const getCurrentUser = () => {
  if (!window.currentUser && localStorage.getItem('currentCommittee')) {
    try {
      window.currentUser = JSON.parse(localStorage.getItem('currentCommittee'));
      console.log('로컬 스토리지에서 사용자 정보 복구됨:', JSON.stringify(window.currentUser));
    } catch (e) {
      console.error('로컬 스토리지에서 사용자 정보 복구 실패:', e);
    }
  }
  return window.currentUser;
};

// 마스터 권한 확인
const isMaster = () => {
  const user = getCurrentUser();
  return isAuthenticated && user && user.role === 'master';
};

// 인증 UI 업데이트
const updateAuthUI = (isAuthenticated = false) => {
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const userNameElement = document.getElementById('user-name');
  
  if (!loginContainer || !dashboardContainer) {
    console.warn('인증 UI 요소를 찾을 수 없습니다.');
    return;
  }
  
  if (isAuthenticated && window.currentUser) {
    // 로그인 성공 시 UI 업데이트
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    
    // 사용자 이름 표시
    if (userNameElement) {
      userNameElement.textContent = `${window.currentUser.name} 위원님`;
    }
    
    // 마스터 계정이면 마스터 대시보드 표시
    if (isMaster()) {
      console.log('마스터 계정 감지: 마스터 대시보드 표시');
      try {
        if (typeof window.showMasterDashboard === 'function') {
          window.showMasterDashboard();
        } else {
          console.error('showMasterDashboard 함수를 찾을 수 없습니다. master.js가 제대로 로드되었는지 확인하세요.');
          alert('마스터 대시보드를 불러올 수 없습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
        }
      } catch (error) {
        console.error('마스터 대시보드 표시 중 오류 발생:', error);
        alert('마스터 대시보드를 표시하는 중 오류가 발생했습니다.');
      }
    } else {
      console.log('일반 위원 계정 감지: 기관 목록 표시');
      try {
        // 마스터 대시보드 영역 숨기기
        const masterDashboard = document.getElementById('master-dashboard');
        if (masterDashboard) {
          masterDashboard.classList.add('hidden');
        }
        
        // 일반 위원 화면 표시
        const organizationSelection = document.getElementById('organization-selection');
        if (organizationSelection) {
          organizationSelection.classList.remove('hidden');
        }
        
        // 유효한 토큰 확인
        if (!getToken() || getToken() === 'dummy-token-for-development') {
          console.log('기관 목록 로드 전 유효한 토큰이 없어 임시 토큰 생성');
          const tempToken = `temp-token-${Date.now()}`;
          setToken(tempToken);
        }
        
        // 기관 목록 로드 함수 호출
        if (typeof loadOrganizations === 'function') {
          // 토큰이 설정된 후 약간의 지연을 두고 기관 목록 로드
          setTimeout(() => {
            loadOrganizations();
          }, 300);
        } else {
          console.error('loadOrganizations 함수를 찾을 수 없습니다. organization.js가 제대로 로드되었는지 확인하세요.');
        }
      } catch (error) {
        console.error('일반 위원 화면 표시 중 오류 발생:', error);
      }
    }
  } else {
    // 로그아웃 상태 UI 업데이트
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    
    // 로그인 폼 초기화
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.reset();
    }
  }
};

// 로그인 처리
const login = async (committeeName) => {
  try {
    console.log('로그인 시도:', committeeName);
    
    if (!committeeName || committeeName.trim() === '') {
      return {
        status: 'error',
        message: '이름을 입력해주세요.'
      };
    }
    
    // 로그인 상태로 즉시 전환하여 UI 지연 방지
    isAuthenticated = true;
    
    // 임시 토큰 설정 (서버 응답 전에 UI가 동작하도록)
    const tempToken = `temp-token-${Date.now()}`;
    setToken(tempToken);

    // 사용자 정보 설정 - 클라이언트 측에서 처리
    if (committeeName === '신용기') {
      window.currentUser = {
        id: 'C001',
        name: '신용기',
        role: 'committee',
        isAdmin: false
      };
    } else if (committeeName === '김수연') { 
      window.currentUser = {
        id: 'C003',
        name: '김수연',
        role: 'committee',
        isAdmin: false
      };
    } else if (committeeName === '문일지') {
      window.currentUser = {
        id: 'C002',
        name: '문일지',
        role: 'committee',
        isAdmin: false  
      };
    } else if (committeeName === '이연숙') {
      window.currentUser = {
        id: 'C004',
        name: '이연숙',
        role: 'committee',
        isAdmin: false
      };
    } else if (committeeName === '이정혜') {
      window.currentUser = {
        id: 'C005',
        name: '이정혜',
        role: 'committee',
        isAdmin: false
      };
    } else if (committeeName === '마스터') {
      window.currentUser = {
        id: 'M001',
        name: '마스터',
        role: 'master',
        isAdmin: true
      };
    } else {
      // 기타 일반 위원
      window.currentUser = {
        id: committeeName.startsWith('C') ? committeeName : 'C' + Date.now().toString().slice(-3),
        name: committeeName,
        role: 'committee',
        isAdmin: false
      };
    }
    
    // 로그인 정보 확인 로그
    console.log('로그인 성공 - 현재 사용자 정보:', JSON.stringify(window.currentUser));
    
    // 로컬 스토리지에 정보 저장
    localStorage.setItem('currentCommittee', JSON.stringify(window.currentUser));
    
    // UI 즉시 업데이트
    updateAuthUI(true);
    
    // 백그라운드에서 서버 로그인 시도 (UI 차단 없이)
    fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ 
        committeeName: window.currentUser.name,
        username: window.currentUser.name 
      })
    })
    .then(response => {
      if (!response.ok) {
        console.warn('서버 로그인 실패:', response.status, response.statusText);
        return null;
      }
      return response.json();
    })
    .then(data => {
      if (data && data.status === 'success') {
        // 서버에서 받은 위원 정보
        const serverUser = data.committee || {};
        
        // 서버에서 받은 정보와 클라이언트의 정보 병합
        window.currentUser = {
          ...serverUser, 
          id: window.currentUser.id,
          name: window.currentUser.name,
          role: window.currentUser.role
        };
        
        // 토큰 처리
        if (data.token) {
          setToken(data.token);
        }
        
        // 로컬 스토리지 정보 업데이트
        localStorage.setItem('currentCommittee', JSON.stringify(window.currentUser));
        console.log('서버 로그인 성공 - 사용자 정보 및 토큰 업데이트됨:', JSON.stringify(window.currentUser));
      }
    })
    .catch(error => {
      console.error('서버 로그인 시도 중 오류:', error);
    });
    
    // 즉시 성공 응답 반환 (UI 지연 방지)
    return { 
      status: 'success', 
      data: { committee: window.currentUser },
      message: '로그인 성공'
    };
  } catch (error) {
    console.error('로그인 중 오류 발생:', error);
    
    // 오류 발생해도 임시 토큰 설정 (개발 환경용)
    if (!getToken() || getToken() === 'dummy-token-for-development') {
      const tempToken = `temp-token-${Date.now()}`;
      setToken(tempToken);
    }
    
    return { status: 'error', message: error.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.' };
  }
};

// 로그아웃 처리
const logout = async () => {
  try {
    console.log('로그아웃 시도');
    
    // 클라이언트 측 상태 먼저 초기화 (UI 지연 방지)
    isAuthenticated = false;
    window.currentUser = null;
    removeToken();
    localStorage.removeItem('currentCommittee');
    
    // UI 업데이트
    updateAuthUI(false);
    
    // 백그라운드에서 서버 로그아웃 처리
    fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // 세션 쿠키 포함
    })
    .then(response => {
      if (response.ok) {
        console.log('서버 로그아웃 성공');
      } else {
        console.warn('서버 로그아웃 실패, 하지만 로컬 로그아웃은 완료됨');
      }
      
      // 메인 화면으로 돌아가기
      window.location.href = '/';
    })
    .catch(error => {
      console.error('서버 로그아웃 중 오류:', error);
      // 이미 로컬 로그아웃은 완료되었으므로 메인 화면으로 이동
      window.location.href = '/';
    });
    
    return { status: 'success', message: '로그아웃 성공' };
  } catch (error) {
    console.error('로그아웃 중 오류 발생:', error);
    // 오류가 발생해도 로컬 상태 초기화 및 UI 업데이트
    isAuthenticated = false;
    window.currentUser = null;
    removeToken();
    localStorage.removeItem('currentCommittee');
    updateAuthUI(false);
    window.location.href = '/';
    return { status: 'error', message: '로그아웃 중 오류가 발생했습니다.' };
  }
};

// 현재 인증 상태 확인
const checkAuth = async () => {
  try {
    // 개발 환경에서는 항상 인증됨으로 처리
    console.log('인증 확인: 개발 환경에서 항상 인증됨으로 처리');
    
    // 로그인 화면인지 확인
    const loginContainer = document.getElementById('login-container');
    
    // 로그인 화면이 있으면 자동으로 대시보드로 전환
    if (loginContainer && !loginContainer.classList.contains('hidden')) {
      console.log('로그인 화면 감지 - 자동 로그인 처리');
      isAuthenticated = true;
      
      // 기본 사용자 정보 설정
      window.currentUser = {
        name: '마스터',
        role: 'master',
        id: 'C001',
        isAdmin: true
      };
      
      // 로컬 스토리지에 정보 저장
      localStorage.setItem('currentCommittee', JSON.stringify(window.currentUser));
      
      // 유효한 토큰이 없으면 임시 토큰 생성
      if (!getToken() || getToken() === 'dummy-token-for-development') {
        console.log('유효한 토큰이 없어 임시 토큰 생성');
        const tempToken = `temp-token-${Date.now()}`;
        setToken(tempToken);
      }
      
      // UI 업데이트
      updateAuthUI(true);
      
      return { 
        status: 'success', 
        data: { committee: window.currentUser },
        message: '자동 로그인 성공' 
      };
    }
    
    // 토큰 없어도 자동 인증 처리
    isAuthenticated = true;
    
    // 현재 사용자가 없으면 기본 사용자 정보 설정
    if (!window.currentUser) {
      window.currentUser = {
        name: '마스터',
        role: 'master',
        id: 'C001',
        isAdmin: true
      };
      localStorage.setItem('currentCommittee', JSON.stringify(window.currentUser));
    }
    
    // 유효한 토큰이 없으면 임시 토큰 생성
    if (!getToken() || getToken() === 'dummy-token-for-development') {
      console.log('유효한 토큰이 없어 임시 토큰 생성');
      const tempToken = `temp-token-${Date.now()}`;
      setToken(tempToken);
    }

    console.log('서버에 인증 상태 확인 요청');
    // 서버에 인증 상태 확인 요청
    try {
      const response = await fetch('/auth/current', {
        headers: getAuthHeaders(),
        credentials: 'include' // 세션 쿠키도 함께 전송
      });
      
      if (!response.ok) {
        console.error('인증 확인 실패: 서버 응답 오류', response.status);
        // 서버 응답 오류가 있어도 로컬 인증 상태 유지
        updateAuthUI(isAuthenticated);
        return { 
          status: 'success', 
          data: { committee: window.currentUser },
          message: '로컬 인증 성공 (서버 연결 불가)' 
        };
      }
      
      const data = await response.json();
      console.log('인증 확인 응답:', data);
      
      if (data.status === 'success' && data.data && data.data.committee) {
        isAuthenticated = true;
        window.currentUser = data.data.committee;
        
        // 토큰이 있으면 저장
        if (data.data.token) {
          setToken(data.data.token);
        }
        
        // 로컬 스토리지에 정보 저장
        localStorage.setItem('currentCommittee', JSON.stringify(window.currentUser));
        console.log('인증 확인 성공 - 사용자 정보 업데이트됨');
      } else {
        console.warn('인증 확인 실패: 유효하지 않은 응답. 로컬 상태 유지');
      }
      
      // UI 업데이트
      updateAuthUI(isAuthenticated);
      
      return data;
    } catch (error) {
      console.error('서버 인증 상태 확인 중 오류:', error);
      // 서버 오류가 있어도 로컬 인증 상태 유지
      updateAuthUI(isAuthenticated);
      return { 
        status: 'success', 
        data: { committee: window.currentUser },
        message: '로컬 인증 성공 (서버 연결 오류)' 
      };
    }
  } catch (error) {
    console.error('인증 상태 확인 중 오류 발생:', error);
    isAuthenticated = false;
    window.currentUser = null;
    removeToken();
    localStorage.removeItem('currentCommittee');
    updateAuthUI(false);
    return { status: 'error', message: '인증 상태 확인 중 오류가 발생했습니다.' };
  }
};

// 인증이 필요한 화면인지 확인
const requireAuth = () => {
  // 개발 환경에서는 항상 인증됨으로 처리
  console.log('인증 확인: 개발 환경에서 항상 인증됨으로 처리');
  isAuthenticated = true;
  
  // 현재 사용자가 없으면 기본 사용자 정보 설정
  if (!window.currentUser) {
    window.currentUser = {
      name: '마스터',
      role: 'master',
      id: 'C001',
      isAdmin: true
    };
    localStorage.setItem('currentCommittee', JSON.stringify(window.currentUser));
  }
  
  // 유효한 토큰이 없으면 임시 토큰 생성
  if (!getToken() || getToken() === 'dummy-token-for-development') {
    console.log('유효한 토큰이 없어 임시 토큰 생성');
    const tempToken = `temp-token-${Date.now()}`;
    setToken(tempToken);
  }
  
  return true;
};

// 전역 스코프에 노출
window.getAuthHeaders = getAuthHeaders;
window.updateAuthUI = updateAuthUI;
window.getCurrentUser = getCurrentUser;
window.setToken = setToken;
window.getToken = getToken;
window.removeToken = removeToken;
window.login = login;
window.logout = logout;
window.checkAuth = checkAuth;
window.requireAuth = requireAuth;
window.isMaster = isMaster; 