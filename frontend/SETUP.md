# Trip Flow Frontend 설정 가이드

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
pnpm install
```

### 2. Google Maps API 키 설정 (필수)

#### 2.1 API 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** > **라이브러리** 메뉴로 이동
4. 다음 API들을 검색하여 **활성화**:
   - **Maps JavaScript API**
   - **Places API** 
   - **Directions API**

5. **API 및 서비스** > **사용자 인증 정보** 메뉴로 이동
6. **+ 사용자 인증 정보 만들기** > **API 키** 선택
7. 생성된 API 키 복사

#### 2.2 API 키 제한 설정 (권장)

보안을 위해 API 키에 제한을 설정하세요:

1. 생성한 API 키 옆 편집 아이콘 클릭
2. **애플리케이션 제한사항**:
   - **HTTP 리퍼러(웹사이트)** 선택
   - 항목 추가:
     - `localhost:5173/*` (개발)
     - `yourdomain.com/*` (프로덕션)

3. **API 제한사항**:
   - **키 제한** 선택
   - 다음 API만 선택:
     - Maps JavaScript API
     - Places API
     - Directions API

4. **저장** 클릭

#### 2.3 환경 변수 파일 생성

프로젝트 루트(`frontend/` 디렉토리)에 `.env` 파일을 생성:

```bash
# frontend/.env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
VITE_API_BASE_URL=http://localhost:8000/api
```

⚠️ **주의**: `.env` 파일은 절대 Git에 커밋하지 마세요!

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 http://localhost:5173 을 엽니다.

## ✅ API 키 없이도 테스트 가능한 부분

API 키가 없어도 다음 기능들은 테스트할 수 있습니다:

- ✅ 홈페이지 (여행 생성 폼)
- ✅ 기본 UI 레이아웃
- ✅ 라우팅

하지만 다음 기능들은 API 키가 필요합니다:

- ❌ 지도 표시
- ❌ 장소 검색
- ❌ 루트 계산
- ❌ 최적화 기능

## 🔧 문제 해결

### "지도를 불러올 수 없습니다" 오류

**원인**:
- API 키가 설정되지 않음
- API 키가 잘못됨
- 필요한 API가 활성화되지 않음

**해결**:
1. `.env` 파일 확인
2. API 키 복사 시 앞뒤 공백 확인
3. Google Cloud Console에서 API 활성화 상태 확인
4. 브라우저 콘솔에서 상세 에러 메시지 확인

### API 키 설정 후에도 작동하지 않음

**해결**:
1. 개발 서버 재시작 (Ctrl+C 후 `pnpm dev`)
2. 브라우저 캐시 클리어 (Ctrl+Shift+R 또는 Cmd+Shift+R)
3. 시크릿/프라이빗 모드에서 테스트

### 검색이 작동하지 않음

**원인**:
- Places API가 활성화되지 않음
- API 키 제한 설정 문제

**해결**:
1. Google Cloud Console > API 및 서비스 > 라이브러리
2. "Places API" 검색하여 활성화 확인
3. API 키 제한 설정에서 Places API 포함 확인

## 💰 비용 관리

### 무료 사용량

Google Maps Platform은 매월 $200의 무료 크레딧을 제공합니다.

### 예상 비용

**일반 사용자** (여행 1회):
- Map loads: $0.007
- Place search: $0.255
- Directions: $0.15
- **총: ~$0.60**

**개발 중**: 개발 단계에서는 무료 크레딧 내에서 충분히 테스트 가능합니다.

### 비용 알림 설정

1. Google Cloud Console > **결제** 메뉴
2. **예산 및 알림** 선택
3. 예산 생성:
   - 일일 예산: $30
   - 월간 예산: $500

## 📚 추가 리소스

- [Google Maps Platform 문서](https://developers.google.com/maps/documentation)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- [프로젝트 README](./README.md)
- [MVP 스펙 문서](../docs/spec.md)

## 🆘 도움이 필요하신가요?

이슈를 생성하거나 문서를 참고하세요!
