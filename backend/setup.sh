#!/bin/bash

# Trip Flow Backend 초기 설정 스크립트
# 사용법: ./setup.sh

set -e  # 에러 발생 시 중단

echo "🚀 Trip Flow Backend 초기 설정을 시작합니다..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Python 버전 확인
echo ""
echo "📌 Python 버전 확인..."
python3 --version

# 2. 가상환경 확인
echo ""
echo "📌 가상환경 확인..."
if command -v workon &> /dev/null; then
    echo -e "${GREEN}✓ virtualenvwrapper가 설치되어 있습니다.${NC}"
    
    # 가상환경 생성 또는 활성화
    if workon trip_flow &> /dev/null; then
        echo -e "${YELLOW}⚠ trip_flow 가상환경이 이미 존재합니다.${NC}"
    else
        echo "📦 trip_flow 가상환경을 생성합니다..."
        mkvirtualenv trip_flow
    fi
else
    echo -e "${YELLOW}⚠ virtualenvwrapper가 설치되어 있지 않습니다.${NC}"
    echo "venv를 사용하여 가상환경을 생성합니다..."
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo -e "${GREEN}✓ venv 가상환경이 생성되었습니다.${NC}"
    else
        echo -e "${YELLOW}⚠ venv 가상환경이 이미 존재합니다.${NC}"
    fi
    
    source venv/bin/activate
fi

# 3. 패키지 설치
echo ""
echo "📦 패키지를 설치합니다..."
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ 패키지 설치가 완료되었습니다.${NC}"

# 4. 환경 변수 파일 확인
echo ""
echo "📌 환경 변수 파일 확인..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env 파일이 생성되었습니다.${NC}"
        echo -e "${YELLOW}⚠ .env 파일을 편집하여 실제 값을 입력하세요.${NC}"
    else
        echo -e "${RED}✗ .env.example 파일이 없습니다.${NC}"
    fi
else
    echo -e "${GREEN}✓ .env 파일이 이미 존재합니다.${NC}"
fi

# 5. PostgreSQL 확인
echo ""
echo "📌 PostgreSQL 확인..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL이 설치되어 있습니다.${NC}"
    
    # PostgreSQL 실행 확인 (macOS brew 기준)
    if brew services list 2>/dev/null | grep postgresql | grep started &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL이 실행 중입니다.${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL이 실행되지 않고 있습니다.${NC}"
        echo "다음 명령어로 실행하세요: brew services start postgresql@16"
    fi
    
    # 데이터베이스 존재 확인
    if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw trip_flow; then
        echo -e "${GREEN}✓ trip_flow 데이터베이스가 존재합니다.${NC}"
    else
        echo -e "${YELLOW}⚠ trip_flow 데이터베이스가 없습니다.${NC}"
        echo "데이터베이스를 생성하시겠습니까? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            psql -U postgres -c "CREATE DATABASE trip_flow;" 2>/dev/null || {
                echo -e "${RED}✗ 데이터베이스 생성에 실패했습니다.${NC}"
                echo "수동으로 생성하세요: psql postgres -c 'CREATE DATABASE trip_flow;'"
            }
        fi
    fi
else
    echo -e "${RED}✗ PostgreSQL이 설치되어 있지 않습니다.${NC}"
    echo "설치하세요: brew install postgresql@16"
fi

# 6. 마이그레이션
echo ""
echo "📌 데이터베이스 마이그레이션..."
read -p "마이그레이션을 실행하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py makemigrations
    python manage.py migrate
    python manage.py createcachetable
    echo -e "${GREEN}✓ 마이그레이션이 완료되었습니다.${NC}"
fi

# 7. 슈퍼유저 생성
echo ""
echo "📌 관리자 계정 생성..."
read -p "관리자 계정을 생성하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py createsuperuser
fi

# 완료
echo ""
echo -e "${GREEN}✅ 초기 설정이 완료되었습니다!${NC}"
echo ""
echo "다음 명령어로 서버를 실행하세요:"
echo "  python manage.py runserver"
echo ""
echo "서버 실행 후 다음 URL에 접속하세요:"
echo "  - API: http://localhost:8000/api"
echo "  - Swagger: http://localhost:8000/_d/swagger/"
echo "  - Admin: http://localhost:8000/_a/"
