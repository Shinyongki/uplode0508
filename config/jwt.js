const jwt = require('jsonwebtoken');

// 보안을 위해 환경 변수 확인하여 로깅
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
console.log(`JWT 설정: ${JWT_SECRET === 'your-secret-key' ? '기본값 사용 (주의)' : '환경 변수 사용'}`);

// JWT 토큰 생성
const generateToken = (user) => {
  try {
    if (!user || !user.name || !user.role) {
      console.error('토큰 생성 실패: 유효하지 않은 사용자 정보');
      return null;
    }

    const token = jwt.sign(
      { 
        id: user.id,
        name: user.name,
        role: user.role,
        organizations: user.organizations // 기관 정보도 포함
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    console.log(`토큰 생성 완료: ${user.name} (${user.role})`);
    return token;
  } catch (error) {
    console.error('토큰 생성 중 오류:', error);
    return null;
  }
};

// JWT 토큰 검증
const verifyToken = (token) => {
  console.log('토큰 검증 시작');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`토큰 검증 성공: ${decoded.name} (${decoded.role})`);
    return { success: true, data: decoded };
  } catch (error) {
    console.error(`토큰 검증 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
  console.log(`인증 요청 경로: ${req.method} ${req.path}`);
  
  // 1. JWT 토큰 확인
  const authHeader = req.headers['authorization'];
  console.log(`Authorization 헤더: ${authHeader ? '존재함' : '없음'}`);
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // 2. 토큰이 없는 경우 세션 확인
  if (!token) {
    if (req.session && req.session.committee) {
      console.log(`세션에서 인증 정보 찾음: ${req.session.committee.name}`);
      req.user = req.session.committee;
      return next();
    }
    
    console.log('토큰과 세션 모두 없음');
    return res.status(401).json({
      status: 'error',
      message: '인증이 필요합니다.'
    });
  }

  // 3. 토큰 검증
  const result = verifyToken(token);
  if (!result.success) {
    // 토큰이 유효하지 않은 경우 세션 확인
    if (req.session && req.session.committee) {
      console.log(`토큰은 유효하지 않지만 세션에서 인증 정보 찾음: ${req.session.committee.name}`);
      req.user = req.session.committee;
      return next();
    }
    
    return res.status(403).json({
      status: 'error',
      message: '유효하지 않은 토큰입니다.'
    });
  }

  req.user = result.data;
  
  // 세션에 사용자 정보 저장 (다음 요청을 위해)
  req.session.committee = result.data;
  
  console.log(`인증 성공: ${req.user.name}`);
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken
}; 