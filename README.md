# 노인맞춤돌봄서비스 상시모니터링 시스템

노인맞춤돌봄서비스의 55개 수행기관을 대상으로 한 상시모니터링 시스템입니다. 광역지원기관의 5명의 모니터링위원이 주담당/부담당 체계로 모니터링을 수행하며, 지표는 '매월', '반기', '연중', '1~3월'로 구분됩니다. 모니터링 결과는 구글 시트에 저장되어 관리됩니다.

## 시스템 개요

- 간단한 이름 기반 인증 시스템을 통한 로그인
- 위원별 담당 기관(주담당/부담당) 목록 제공
- 모니터링 주기별 지표 관리(매월/반기/연중/1~3월)
- 지표 특성별(공통필수/공통선택/평가연계) 구분
- 점검 방법(온라인/현장) 구분
- 모니터링 결과 입력 및 관리
- 결과 데이터 구글 시트 자동 저장

## 필수 조건

- Node.js 14.x 이상
- npm 6.x 이상
- 인터넷 연결
- Google API 인증 정보

## 설치 및 구성

1. 저장소 복제
```
git clone <repository-url>
cd senior-care-monitoring-system
```

2. 의존성 설치
```
npm install
```

3. 환경 변수 설정
`.env` 파일을 수정하여 다음 정보를 입력합니다:
```dotenv
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret
GOOGLE_API_CLIENT_ID=your_google_api_client_id
GOOGLE_API_CLIENT_SECRET=your_google_api_client_secret
GOOGLE_API_REDIRECT_URI=http://localhost:3000/auth/google/callback
SPREADSHEET_ID=your_spreadsheet_id
USE_SERVICE_ACCOUNT=true                 # 서비스 계정 사용 여부 (true/false)
SERVICE_ACCOUNT_KEY_PATH=path/to/service-account.json  # 서비스 계정 키 파일 경로
```

4. 구글 API 인증 설정
`credentials.json` 파일을 설정합니다.

5. 서버 시작
```
npm start
```
개발 모드로 실행하려면:
```
npm run dev
```

## 구글 시트 구성

시스템은 다음과 같은 구글 시트 구조를 사용합니다:

1. 마스터 시트
   - `위원_기관_매핑`: 모니터링위원과 담당 기관 간의 연결 관계
   - `지표_관리`: 모니터링 지표 정보
   - `기관_목록`: 수행기관 정보
   - `시스템_설정`: 시스템 설정값

2. 위원별 전용 시트
   - 각 모니터링위원별로 전용 시트 (`위원명_모니터링`)

3. 통합 결과 시트
   - `모니터링_결과_통합`: 모든 평가 결과

## 기술 스택

- **백엔드**: Node.js, Express
- **프론트엔드**: HTML, CSS, JavaScript, Tailwind CSS
- **데이터 저장**: Google Sheets API
- **인증**: 세션 기반 간단한 인증

## 문의 및 지원

본 시스템에 대한 문의사항이나 지원이 필요하시면 다음 연락처로 문의해주세요:
- 이메일: example@example.com
- 전화: 000-0000-0000

## 로컬 개발

1. 의존성 설치:
```
npm install
```

2. 환경 변수 설정:
`.env` 파일을 루트 디렉토리에 생성하고 필요한 환경 변수를 설정합니다.

3. 개발 서버 실행:
```
npm start
```

## Vercel 배포

이 프로젝트는 Vercel에 배포할 수 있도록 설정되어 있습니다.

1. Vercel 계정 설정:
   - [Vercel](https://vercel.com)에 가입하고 GitHub 계정을 연결합니다.

2. 프로젝트 배포:
   - Vercel 대시보드에서 "Import Project"를 클릭합니다.
   - GitHub 저장소를 선택합니다.
   - 기본 설정을 유지하고 "Deploy"를 클릭합니다.

3. 환경 변수 설정:
   - 배포 후 프로젝트의 "Settings" > "Environment Variables"에서 다음 환경 변수를 설정합니다:
     - `NODE_ENV`: production
     - `SESSION_SECRET`: 세션 암호화를 위한 비밀 키
     - `GOOGLE_API_CLIENT_ID`: Google API 클라이언트 ID
     - `GOOGLE_API_CLIENT_SECRET`: Google API 클라이언트 시크릿
     - `GOOGLE_API_REDIRECT_URI`: 배포된 도메인을 사용한 리다이렉트 URI (예: https://your-app.vercel.app/auth/google/callback)
     - `SPREADSHEET_ID`: 구글 스프레드시트 ID

4. 재배포:
   - 환경 변수 설정 후 "Redeploy" 버튼을 클릭하여 새 설정을 적용합니다.

**참고**: 로컬 개발에서 사용한 `PORT` 환경 변수는 Vercel에서 무시됩니다. Vercel은 자체적으로 포트를 관리합니다.

## Google API 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 생성합니다.
2. Google Sheets API와 Google Drive API를 활성화합니다.
3. OAuth 동의 화면을 설정합니다.
4. OAuth 2.0 클라이언트 ID를 생성합니다.
5. 승인된 리다이렉션 URI에 로컬 개발 URL과 배포 URL을 추가합니다:
   - `http://localhost:3000/auth/google/callback`
   - `https://your-app.vercel.app/auth/google/callback`

**서비스 계정 설정**
1. Google Cloud Console에서 서비스 계정을 생성하고 JSON 키 파일을 다운로드합니다.
2. `.env`의 `USE_SERVICE_ACCOUNT`를 `true`로 설정하고, `SERVICE_ACCOUNT_KEY_PATH`를 다운로드한 키 파일 경로로 지정합니다。
3. 스프레드시트를 서비스 계정 이메일(예: `xxx@project.iam.gserviceaccount.com`)에 공유하여 읽기/쓰기를 허용합니다。

## 일정관리 페이지 개선 내역

### 1. 페이지 로딩 성능 개선
- **데이터 로딩 최적화**
  - initialize() 함수 재구성: 단계적 데이터 로드 및 렌더링 구현
  - 필수 데이터(사용자, 위원 목록)를 우선 로드 후 UI 렌더링
  - 나머지 데이터(기관, 일정 등)는 백그라운드에서 비동기 로드
  - Promise.all을 통한 병렬 API 호출로 로딩 시간 단축

- **DOM 조작 최소화**
  - DocumentFragment 사용하여 DOM 업데이트 일괄 처리
  - 이벤트 리스너 중복 등록 방지 (calendarGrid._clickListenerAdded 플래그 사용)
  - 드롭다운에서 기존 선택값 보존 로직 구현

- **캐싱 개선**
  - committeeMap 추가: 위원 ID를 키로 이름을 빠르게 조회
  - 일정 데이터의 날짜별 그룹화 성능 개선
  - 날짜 계산 로직 미리 처리하여 렌더링 최적화

### 2. 날짜 표시 문제 해결
- **타임존 이슈 수정**
  - Date 객체에서 직접 연, 월, 일 추출 후 ISO 형식으로 변환
  - 날짜 변환 로직 통일화: `YYYY-MM-DD` 형식 일관 적용
  - 날짜 선택 시 이틀 전 날짜가 표시되는 문제 해결

### 3. 위원 이름 표시 개선
- **모니터링위원 이름 매핑 구현**
  - mapCommitteeName() 함수 개선: '모니터링위원N'을 실제 이름으로 변환
  - 위원 이름 매핑 일관성 적용: 일정 목록, 모달, 드롭다운에 모두 적용
  - 위원 ID 기반으로 이름을 찾을 수 없을 때 캐시에서 조회 로직 추가

### 4. 모달창 사용성 개선
- **일정 추가/수정 모달 최적화**
  - 저장 버튼 클릭 시 모달창 즉시 닫기 구현
  - 폼 유효성 검사 분리: validateScheduleForm() 함수 추가
  - 불필요한 로그 제거 및 오류 처리 개선

### 5. 기타 개선사항
- **코드 가독성 및 유지보수성 향상**
  - console.time/timeEnd 추가: 성능 측정 지표 제공
  - 함수 분리로 책임 명확화: handleCalendarClick() 등
  - 중복 코드 제거 및 로직 일관성 개선
  - null/undefined 안전하게 처리 (optional chaining) 