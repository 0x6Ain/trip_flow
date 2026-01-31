# Trip Flow AWS 배포 가이드

이 가이드는 AWS Free Tier를 활용하여 Trip Flow 애플리케이션을 배포하는 방법을 설명합니다.

## 📋 사전 준비사항

### 1. 필요한 도구 설치

```bash
# Terraform 설치 (macOS)
brew install terraform

# AWS CLI 설치
brew install awscli

# AWS CLI 설정
aws configure
```

### 2. AWS 계정 설정

- AWS 계정 생성 (Free Tier 적용)
- IAM 사용자 생성 및 Access Key 발급
- 필요한 권한: EC2, VPC, Security Group 관리 권한

### 3. SSH 키 페어 준비

```bash
# 새로운 SSH 키 생성 (없는 경우)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/trip_flow_key

# 공개 키 확인
cat ~/.ssh/trip_flow_key.pub
```

## 🚀 배포 프로세스

### 1단계: Terraform으로 인프라 구성

```bash
# Terraform 디렉토리로 이동
cd terraform

# 변수 파일 생성 및 설정
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 다음 값을 실제 값으로 수정:
# - ssh_public_key: ~/.ssh/trip_flow_key.pub 내용 복사
# - allowed_ssh_cidr: 본인 IP로 제한 (보안 강화)

# Terraform 초기화
terraform init

# 실행 계획 확인
terraform plan

# 인프라 생성
terraform apply
```

생성된 EC2 인스턴스 정보 확인:

```bash
# 퍼블릭 IP 확인
terraform output instance_public_ip

# SSH 접속 명령어 확인
terraform output ssh_connection_command
```

### 2단계: 애플리케이션 코드 업로드

#### 방법 1: Git 사용 (권장)

```bash
# EC2 서버에 SSH 접속
ssh -i ~/.ssh/trip_flow_key ubuntu@<EC2_PUBLIC_IP>

# 애플리케이션 디렉토리로 이동
cd /opt/trip_flow

# Git 리포지토리 클론
git clone https://github.com/your-username/trip_flow.git .
```

#### 방법 2: SCP로 직접 전송

```bash
# 로컬에서 실행
cd /Users/jinyoung/Projects/trip_flow
scp -i ~/.ssh/trip_flow_key -r ./* ubuntu@<EC2_PUBLIC_IP>:/opt/trip_flow/
```

### 3단계: 환경 변수 설정

```bash
# EC2 서버에서 실행
cd /opt/trip_flow

# 프로덕션 환경 변수 파일 생성
cp .env.production.example .env.production
nano .env.production
```

`.env.production` 파일 내용:

```env
# Django Settings
SECRET_KEY=<강력한-랜덤-키-생성>
DEBUG=False
ALLOWED_HOSTS=<EC2_PUBLIC_IP>,<도메인-있는-경우>

# Database Settings
DATABASE_NAME=trip_flow
DATABASE_USER=postgres
DATABASE_PASSWORD=<강력한-비밀번호-설정>

# Google Maps API Key
GOOGLE_MAPS_API_KEY=<실제-API-키>

# Frontend Environment
VITE_API_BASE_URL=/api
VITE_GOOGLE_MAPS_API_KEY=<실제-API-키>
```

**보안 팁:**

- SECRET_KEY는 Django의 `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` 명령으로 생성
- DATABASE_PASSWORD는 강력한 비밀번호로 설정

### 4단계: 애플리케이션 배포

```bash
# 배포 스크립트 실행
cd /opt/trip_flow
./deploy.sh
```

배포 스크립트가 다음을 자동으로 수행합니다:

1. Docker 이미지 빌드
2. 데이터베이스 마이그레이션
3. 캐시 테이블 생성
4. Static 파일 수집
5. 모든 컨테이너 시작

### 5단계: 배포 확인

```bash
# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f

# 개별 서비스 로그 확인
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# 헬스체크
curl http://localhost/api/health/
```

브라우저에서 `http://<EC2_PUBLIC_IP>` 접속하여 확인

## 🔧 관리 및 운영

### 애플리케이션 업데이트

```bash
# SSH 접속
ssh -i ~/.ssh/trip_flow_key ubuntu@<EC2_PUBLIC_IP>

# 코드 업데이트 (Git 사용 시)
cd /opt/trip_flow
git pull origin main

# 재배포
./deploy.sh
```

### 로그 확인

```bash
# 전체 로그
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f backend

# 최근 100줄만 보기
docker compose logs --tail=100 backend

# 에러 로그만 필터링
docker compose logs backend | grep ERROR
```

### 데이터베이스 백업

```bash
# 백업 디렉토리 생성
mkdir -p /opt/trip_flow/backups

# 데이터베이스 백업
docker compose exec db pg_dump -U postgres trip_flow > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 백업 복원
docker compose exec -T db psql -U postgres trip_flow < backups/backup_YYYYMMDD_HHMMSS.sql
```

### 컨테이너 재시작

```bash
# 전체 재시작
docker compose restart

# 특정 서비스만 재시작
docker compose restart backend

# 전체 중지 후 시작
docker compose down
docker compose up -d
```

### 자동 시작 설정 (재부팅 시)

```bash
# 서비스 활성화
sudo systemctl enable trip-flow.service

# 서비스 시작
sudo systemctl start trip-flow.service

# 서비스 상태 확인
sudo systemctl status trip-flow.service
```

## 🔒 보안 강화

### 1. SSH 접근 제한

```bash
# 본인 IP만 SSH 허용하도록 Security Group 수정
# terraform.tfvars 파일에서:
allowed_ssh_cidr = ["<본인_IP>/32"]

# Terraform 적용
terraform apply
```

### 2. SSL/TLS 인증서 설정 (도메인이 있는 경우)

```bash
# Certbot 설치
sudo apt-get install certbot

# Let's Encrypt 인증서 발급
sudo certbot certonly --webroot -w /opt/trip_flow/certbot/www -d yourdomain.com

# Nginx 설정에서 HTTPS 블록 주석 해제
nano /opt/trip_flow/nginx.conf

# Nginx 재시작
docker compose restart nginx
```

### 3. 방화벽 설정 (추가 보안)

```bash
# UFW 방화벽 활성화
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 💰 비용 관리

### Free Tier 한도

- **EC2 t2.micro**: 750시간/월 (1개 인스턴스 24/7 운영 가능)
- **EBS**: 30GB까지 무료
- **데이터 전송**: 송신 15GB/월까지 무료

### 비용 최적화 팁

1. **Elastic IP**: 사용하지 않을 때는 해제 (미사용 시 과금)
2. **스냅샷**: 정기적으로 불필요한 스냅샷 삭제
3. **CloudWatch 알람**: 비용 알람 설정
4. **인스턴스 중지**: 개발 중이 아닐 때는 중지

### 인스턴스 중지/시작

```bash
# 로컬에서 AWS CLI로 제어
aws ec2 stop-instances --instance-ids <INSTANCE_ID>
aws ec2 start-instances --instance-ids <INSTANCE_ID>
```

## 🐛 트러블슈팅

### 문제: 메모리 부족

```bash
# Swap 메모리 확인
free -h

# 컨테이너 메모리 사용량 확인
docker stats

# 해결: Worker 수 줄이기 (docker-compose.yml에서)
# gunicorn --workers 2 -> gunicorn --workers 1
```

### 문제: 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker compose logs backend

# 환경 변수 확인
docker compose config

# 컨테이너 재빌드
docker compose build --no-cache
docker compose up -d
```

### 문제: 데이터베이스 연결 실패

```bash
# DB 컨테이너 상태 확인
docker compose ps db

# DB 로그 확인
docker compose logs db

# DB 재시작
docker compose restart db
```

### 문제: Nginx 502 Bad Gateway

```bash
# Backend가 실행 중인지 확인
docker compose ps backend

# Backend 로그 확인
docker compose logs backend

# 네트워크 확인
docker compose exec nginx ping backend
```

## 📊 모니터링

### 기본 모니터링

```bash
# 서버 리소스 확인
htop

# 디스크 사용량
df -h

# Docker 리소스 사용량
docker stats

# 애플리케이션 로그 실시간 모니터링
docker compose logs -f --tail=100
```

### CloudWatch 알람 설정 (선택사항)

AWS Console에서 다음 알람 설정:

- CPU 사용률 > 80%
- 디스크 사용률 > 80%
- 예상 비용 > $5

## 🔄 인프라 제거

더 이상 사용하지 않을 때:

```bash
# EC2 서버에서 컨테이너 중지
docker compose down -v

# 로컬에서 Terraform으로 인프라 제거
cd terraform
terraform destroy
```

**주의**: 이 명령은 모든 데이터를 삭제합니다. 필요한 데이터는 백업하세요!

## 📚 추가 리소스

- [Django 프로덕션 체크리스트](https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Free Tier 가이드](https://aws.amazon.com/free/)

## 🆘 지원

문제가 발생하면:

1. `/var/log/user-data.log` 확인
2. `docker compose logs` 확인
3. GitHub Issues에 문의
