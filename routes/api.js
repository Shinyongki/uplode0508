const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../config/jwt');
const organizationController = require('../controllers/organizationController');
const resultController = require('../controllers/resultController');
const indicatorController = require('../controllers/indicatorController');
const committeeController = require('../controllers/committeeController');
const scheduleController = require('../controllers/scheduleController');
const committeeModel = require('../models/committee');
const organizationModel = require('../models/organization');

// API 요청 디버깅용 미들웨어
router.use((req, res, next) => {
  console.log(`API 요청 처리 중: ${req.method} ${req.url}`);
  console.log('요청 헤더:', req.headers);
  
  // 개발 환경에서는 인증 우회 허용 (필요 시 제거)
  if (process.env.NODE_ENV === 'development') {
    console.log(`개발 환경에서 인증 우회됨: ${req.url}`);
    
    // 개발 환경에서 테스트를 위한 mock 사용자 설정
    if (!req.user) {
      req.user = {
        name: 'DevUser',
        role: 'master',
        id: 'DEV001',
        isAdmin: true
      };
    }
    next();
    return;
  }
  
  next();
});

// 테스트 경로 - 연결 확인용
router.get('/test', (req, res) => {
  console.log('테스트 API 호출됨');
  return res.status(200).json({
    status: 'success',
    message: 'API 테스트 성공',
    timestamp: new Date().toISOString()
  });
});

// 위원 관련 API
router.get('/committees', committeeController.getAllCommittees);
router.get('/committees/me', authenticateToken, committeeController.getCurrentCommittee);
router.get('/committees/all', authenticateToken, committeeController.getAllCommitteesFromSheet);
// 시트에서 위원 목록 가져오기 API 추가
router.get('/committees/sheet', committeeController.getAllCommitteesFromSheet);

// 테스트용 경로 추가
router.get('/test-committees', (req, res) => {
  console.log('테스트 위원 목록 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      committees: [
        { name: '홍길동', id: 'C001', role: '위원' },
        { name: '김철수', id: 'C002', role: '위원' },
        { name: '이영희', id: 'C003', role: '위원장' }
      ] 
    }
  });
});

// 기관 관련 API
router.get('/organizations', organizationController.getAllOrganizations);
router.get('/organizations/my', authenticateToken, organizationController.getMyOrganizations);
router.get('/organizations/:orgCode', organizationController.getOrganizationByCode);
router.post('/organizations', authenticateToken, organizationController.addOrganization);
router.put('/organizations/:orgCode', authenticateToken, organizationController.updateOrganization);
router.delete('/organizations/:orgCode', authenticateToken, organizationController.deleteOrganization);

// 테스트용 경로 추가
router.get('/test-organizations', (req, res) => {
  console.log('테스트 기관 목록 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      organizations: [
        { code: 'A48120002', name: '창원도우누리노인종합재단', type: '복지관', region: '경남', address: '경남 창원시 의창구' },
        { code: 'A48120011', name: '경원사회복지종합', type: '복지관', region: '경남', address: '경남 창원시 성산구' },
        { code: 'A48120013', name: '진해노인종합복지관', type: '복지관', region: '경남', address: '경남 창원시 진해구' },
        { code: 'A48250001', name: '효성원노인종합지원센터', type: '종합지원센터', region: '경남', address: '경남 진주시' },
        { code: 'A48250005', name: '성명의전화노인종합지원센터', type: '종합지원센터', region: '경남', address: '경남 진주시' }
      ] 
    }
  });
});

// 내 기관 테스트 경로
router.get('/test-organizations/my', (req, res) => {
  console.log('테스트 내 기관 목록 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      mainOrganizations: [
        { code: 'A48120002', name: '창원도우누리노인종합재단', type: '복지관', region: '경남', address: '경남 창원시 의창구' },
        { code: 'A48120011', name: '경원사회복지종합', type: '복지관', region: '경남', address: '경남 창원시 성산구' }
      ],
      subOrganizations: [
        { code: 'A48250001', name: '효성원노인종합지원센터', type: '종합지원센터', region: '경남', address: '경남 진주시' }
      ] 
    }
  });
});

// 지표 관련 API
router.get('/indicators', indicatorController.getAllIndicators);
router.get('/indicators/period/:period', indicatorController.getIndicatorsByPeriod);
router.get('/indicators/:indicatorId', indicatorController.getIndicatorById);

// 지표 테스트 경로
router.get('/test-indicators', (req, res) => {
  console.log('테스트 지표 목록 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      indicators: [
        { 
          id: 1, 
          category: '운영관리', 
          name: '1-1. 기관 운영규정', 
          description: '기관 운영에 필요한 규정이 마련되어 있고, 규정에 따라 기관을 운영한다.', 
          items: [
            '① 기관운영에 필요한 규정이 마련되어 있다.',
            '② 규정은 이사회의 승인을 거쳐 마련되었다.',
            '③ 규정이 필요에 따라 개정되고 있다.'
          ]
        },
        { 
          id: 2, 
          category: '운영관리', 
          name: '1-2. 운영계획서 및 예산', 
          description: '기관의 연간 운영계획서와 예산서가 이사회의 승인을 받아 수립되어 있고, 이에 따라 기관을 운영한다.', 
          items: [
            '① 기관의 연간 운영계획서가 이사회의 승인을 받아 수립되어 있다.',
            '② 기관의 연간 예산서가 이사회의 승인을 받아 수립되어 있다.',
            '③ 기관의 연간 운영계획에 준하여 사업이 진행되고 있다.',
            '④ 기관의 연간 예산에 따라 집행되고 있다.'
          ]
        },
        { 
          id: 3, 
          category: '인적자원관리', 
          name: '2-1. 인력확보', 
          description: '복지관 운영에 필요한 인력을 확보하고 있다.', 
          items: [
            '① 복지관 운영에 필요한 인력을 기준에 맞게 확보하고 있다.',
            '② 직원의 자격증 소지 등 자격기준을 준수하고 있다.'
          ]
        },
        { 
          id: 4, 
          category: '인적자원관리', 
          name: '2-2. 자원봉사자 관리', 
          description: '지역사회 자원봉사자를 발굴하고 관리한다.', 
          items: [
            '① 복지관내에 자원봉사자 관리 담당직원이 있다.',
            '② 자원봉사자 교육, 배치, 관리 등에 관한 규정이 있고 그에 따라 운영되고 있다.',
            '③ 자원봉사자를 대상으로 정기적인 교육을 실시하고 있다.'
          ]
        },
        { 
          id: 5, 
          category: '시설안전관리', 
          name: '3-1. 시설안전점검', 
          description: '정기적인 안전점검을 실시한다.', 
          items: [
            '① 시설에 대한 안전점검을 정기적으로 실시한다.',
            '② 안전점검 결과에 따라 개선조치를 취하고 있다.'
          ]
        }
      ] 
    }
  });
});

// 모니터링 결과 관련 API
router.post('/results', authenticateToken, resultController.saveMonitoringResult);
router.get('/results/organization/:orgCode', authenticateToken, resultController.getResultsByOrganization);
router.get('/results/me', authenticateToken, resultController.getMyResults);
router.get('/results/organization/:orgCode/indicator/:indicatorId', authenticateToken, resultController.getResultByOrgAndIndicator);
router.post('/results/cleanup', authenticateToken, resultController.cleanupDuplicateResults);

// 담당자 매칭 관련 API
router.post('/committees/matching', authenticateToken, committeeController.updateCommitteeMatching);
router.get('/committees/matchings', authenticateToken, committeeController.getAllCommitteeMatchings);
// matching 단수형 엔드포인트 추가
router.get('/committees/matching', authenticateToken, committeeController.getAllCommitteeMatchings);

// 매칭 테스트 엔드포인트 추가
router.get('/committees/matchings/test', (req, res) => {
  console.log('테스트 위원-기관 매칭 API 호출됨');
  return res.status(200).json({
    status: 'success',
    source: 'test-data',
    data: {
      matchings: [
        { committeeId: 'C001', committeeName: '이정혜', orgCode: 'A48120005', orgName: '생명의전화노인복지센터', region: '경남', role: '주담당' },
        { committeeId: 'C002', committeeName: '이연숙', orgCode: 'A48120006', orgName: '보현행정노인복지센터', region: '경남', role: '주담당' },
        { committeeId: 'C003', committeeName: '문일지', orgCode: 'A48120003', orgName: '마산시니어클럽', region: '경남', role: '주담당' },
        { committeeId: 'C004', committeeName: '신용기', orgCode: 'A48120001', orgName: '동진노인종합복지센터', region: '경남', role: '주담당' },
        { committeeId: 'C004', committeeName: '신용기', orgCode: 'A48120002', orgName: '창원도우누리노인복지센터', region: '경남', role: '주담당' },
        { committeeId: 'C005', committeeName: '김수연', orgCode: 'A48120004', orgName: '김해시니어클럽', region: '경남', role: '주담당' }
      ]
    }
  });
});

// 모든 기관 정보를 가져오는 API (위원-기관 매칭용)
router.get('/organizations/all', authenticateToken, organizationController.getAllOrganizations);

// 위원별 담당기관 API - 테스트 모드
router.get('/committees/matchings/test', (req, res) => {
  console.log('테스트 위원-기관 매칭 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      matchings: [
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48120001', orgName: '동진노인종합복지센터', region: '경남', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48120002', orgName: '창원도우누리노인복지센터', region: '경남', role: '주담당' },
        { committeeId: 'C신용기', committeeName: '신용기', orgCode: 'A48120003', orgName: '마산시니어클럽', region: '경남', role: '부담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48120003', orgName: '마산시니어클럽', region: '경남', role: '주담당' },
        { committeeId: 'C문일지', committeeName: '문일지', orgCode: 'A48120005', orgName: '생명의전화노인복지센터', region: '경남', role: '부담당' },
        { committeeId: 'C김수연', committeeName: '김수연', orgCode: 'A48120004', orgName: '김해시니어클럽', region: '경남', role: '주담당' },
        { committeeId: 'C이정혜', committeeName: '이정혜', orgCode: 'A48120005', orgName: '생명의전화노인복지센터', region: '경남', role: '주담당' },
        { committeeId: 'C이연숙', committeeName: '이연숙', orgCode: 'A48120006', orgName: '보현행정노인복지센터', region: '경남', role: '주담당' }
      ] 
    }
  });
});

// 모든 기관 목록 테스트 API
router.get('/organizations/all/test', (req, res) => {
  console.log('테스트 전체 기관 목록 API 호출됨');
  return res.status(200).json({
    status: 'success',
    source: 'test-data',
    data: { 
      organizations: [
        { code: 'A48120001', name: '동진노인종합복지센터', region: '경남' },
        { code: 'A48120002', name: '창원도우누리노인복지센터', region: '경남' },
        { code: 'A48120003', name: '마산시니어클럽', region: '경남' },
        { code: 'A48120004', name: '김해시니어클럽', region: '경남' },
        { code: 'A48120005', name: '생명의전화노인복지센터', region: '경남' },
        { code: 'A48120006', name: '보현행정노인복지센터', region: '경남' }
      ] 
    }
  });
});

// 일정 관련 API
router.get('/schedules', authenticateToken, scheduleController.getAllSchedules);
router.get('/schedules/me', authenticateToken, scheduleController.getMySchedules);
router.get('/schedules/committee/:committeeId', authenticateToken, scheduleController.getSchedulesByCommitteeId);
router.get('/schedules/organization/:orgCode', authenticateToken, scheduleController.getSchedulesByOrgCode);
router.get('/schedules/date-range', authenticateToken, scheduleController.getSchedulesByDateRange);
router.post('/schedules', authenticateToken, scheduleController.addSchedule);
router.put('/schedules/:scheduleId', authenticateToken, scheduleController.updateSchedule);
router.delete('/schedules/:scheduleId', authenticateToken, scheduleController.deleteSchedule);

// 보고서 관련 API
// 위원 목록 조회
router.get('/committees/report', authenticateToken, async (req, res) => {
  try {
    const committees = await committeeModel.getAllCommittees();
    
    // 각 위원별 담당 기관 수와 진행률 계산
    const enrichedCommittees = await Promise.all(committees.map(async (committee) => {
      // 위원이 담당하는 기관 목록
      const organizations = await organizationModel.getOrganizationsByCommitteeId(committee.id);
      
      // 진행률은 임의로 계산 (이후 실제 데이터로 대체 필요)
      const progressRate = Math.floor(Math.random() * 100);
      
      return {
        ...committee,
        organizationCount: organizations.length,
        progressRate
      };
    }));
    
    return res.status(200).json({
      status: 'success',
      data: { committees: enrichedCommittees }
    });
  } catch (error) {
    console.error('위원 목록 조회 오류:', error);
    return res.status(500).json({
      status: 'error',
      message: '위원 목록을 가져오는 중 오류가 발생했습니다.'
    });
  }
});

// 기관 매칭 정보 조회
router.get('/organizations/matching', authenticateToken, async (req, res) => {
  try {
    console.log('기관 매칭 정보 조회 API 호출됨');
    const organizations = await organizationModel.getAllOrganizations();
    
    // 각 기관별 담당 위원 정보와 진행률 계산
    const enrichedOrganizations = await Promise.all(organizations.map(async (org) => {
      // 진행률은 임의로 계산 (이후 실제 데이터로 대체 필요)
      const progressRate = Math.floor(Math.random() * 100);
      
      return {
        ...org,
        mainCommitteeName: '담당자' + Math.floor(Math.random() * 10),
        subCommitteeName: '부담당자' + Math.floor(Math.random() * 10),
        progressRate
      };
    }));
    
    return res.status(200).json({
      status: 'success',
      data: { organizations: enrichedOrganizations }
    });
  } catch (error) {
    console.error('기관 매칭 정보 조회 오류:', error);
    return res.status(500).json({
      status: 'error',
      message: '기관 매칭 정보를 가져오는 중 오류가 발생했습니다.'
    });
  }
});

// 테스트용 경로 - 일정 목록
router.get('/test-schedules', (req, res) => {
  console.log('테스트 일정 목록 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      schedules: [
        { 
          id: 'S001', 
          committeeId: 'C001', 
          committeeName: '홍길동', 
          orgCode: 'A48120002', 
          orgName: '창원도우누리노인종합재단', 
          visitDate: '2025-05-15', 
          startTime: '10:00', 
          endTime: '12:00', 
          notes: '정기 방문' 
        },
        { 
          id: 'S002', 
          committeeId: 'C002', 
          committeeName: '김철수', 
          orgCode: 'A48120011', 
          orgName: '경원사회복지종합', 
          visitDate: '2025-05-20', 
          startTime: '14:00', 
          endTime: '16:00', 
          notes: '특별 점검' 
        },
        { 
          id: 'S003', 
          committeeId: 'C003', 
          committeeName: '이영희', 
          orgCode: 'A48250001', 
          orgName: '효성원노인종합지원센터', 
          visitDate: '2025-05-25', 
          startTime: '09:00', 
          endTime: '17:00', 
          notes: '전체 모니터링' 
        }
      ] 
    }
  });
});

// 테스트용 보고서 API - 인증 없음
router.get('/test-organizations-matching', (req, res) => {
  console.log('테스트 기관 매칭 정보 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      organizations: [
        { 
          code: 'A48120001', 
          name: '동진노인종합복지센터', 
          region: '경남',
          mainCommitteeName: '홍길동',
          subCommitteeName: '김철수',
          progressRate: 75
        },
        { 
          code: 'A48120002', 
          name: '창원도우누리노인복지센터', 
          region: '경남',
          mainCommitteeName: '이영희',
          subCommitteeName: '박민수',
          progressRate: 60
        },
        { 
          code: 'A48120003', 
          name: '마산시니어클럽', 
          region: '경남',
          mainCommitteeName: '정은지',
          subCommitteeName: '최수진',
          progressRate: 85
        },
        { 
          code: 'A48120004', 
          name: '김해시니어클럽', 
          region: '경남',
          mainCommitteeName: '강동원',
          subCommitteeName: '없음',
          progressRate: 45
        }
      ] 
    }
  });
});

// 테스트용 위원 보고서 API - 인증 없음
router.get('/test-committees-report', (req, res) => {
  console.log('테스트 위원 정보 API 호출됨');
  return res.status(200).json({
    status: 'success',
    data: { 
      committees: [
        { 
          id: 'C001',
          name: '홍길동',
          phone: '010-1234-5678',
          organizationCount: 3,
          progressRate: 75
        },
        { 
          id: 'C002',
          name: '김철수',
          phone: '010-2345-6789',
          organizationCount: 2,
          progressRate: 60
        },
        { 
          id: 'C003',
          name: '이영희',
          phone: '010-3456-7890',
          organizationCount: 4,
          progressRate: 85
        },
        { 
          id: 'C004',
          name: '박민수',
          phone: '010-4567-8901',
          organizationCount: 1,
          progressRate: 45
        }
      ] 
    }
  });
});

// 경로 테스트용 엔드포인트 - 문제가 있는 catch-all 경로를 삭제
// 다른 경로가 먼저 처리되고 남은 요청은 Express의 기본 404 처리에 맡긴다

module.exports = router; 