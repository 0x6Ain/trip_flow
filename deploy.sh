#!/bin/bash
set -e

echo "=== Trip Flow 로컬 배포 스크립트 ==="

# 환경 변수 파일 확인
if [ ! -f ".env.production" ]; then
    echo "❌ ERROR: .env.production 파일이 없습니다."
    echo "다음 명령어로 파일을 생성하세요:"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production"
    exit 1
fi

echo "✓ 환경 변수 파일 확인 완료"

# 기존 컨테이너 중지
echo ""
echo "=== 기존 컨테이너 중지 중... ==="
docker compose --env-file .env.production down

# 이미지 빌드
echo ""
echo "=== Docker 이미지 빌드 중... ==="
docker compose --env-file .env.production build

# 컨테이너 시작
echo ""
echo "=== 컨테이너 시작 중... ==="
docker compose --env-file .env.production up -d

# 상태 확인
echo ""
echo "=== 컨테이너 상태 확인 ==="
docker compose ps

echo ""
echo "=== 배포 완료! ==="
echo ""
echo "📊 로그 확인: docker compose logs -f"
echo "🔍 상태 확인: docker compose ps"
echo "🌐 접속: http://localhost"
