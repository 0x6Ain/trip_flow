#!/bin/bash
set -e

# 로그 파일 설정
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "=== Trip Flow EC2 초기화 시작 ==="
echo "Environment: ${environment}"
echo "Date: $(date)"

# 시스템 업데이트
echo "=== 시스템 업데이트 중... ==="
apt-get update
apt-get upgrade -y

# 필수 패키지 설치
echo "=== 필수 패키지 설치 중... ==="
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    unzip

# Docker 설치
echo "=== Docker 설치 중... ==="
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker 서비스 시작
systemctl start docker
systemctl enable docker

# ubuntu 사용자를 docker 그룹에 추가
usermod -aG docker ubuntu

# Docker Compose 설치 (standalone)
echo "=== Docker Compose 설치 중... ==="
DOCKER_COMPOSE_VERSION="2.24.5"
curl -L "https://github.com/docker/compose/releases/download/v$${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 애플리케이션 디렉토리 생성
echo "=== 애플리케이션 디렉토리 생성 중... ==="
mkdir -p /opt/trip_flow
chown ubuntu:ubuntu /opt/trip_flow

# 배포 스크립트 생성
cat > /opt/trip_flow/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Trip Flow 배포 시작 ==="

cd /opt/trip_flow

# Git 리포지토리 클론 또는 업데이트
if [ ! -d ".git" ]; then
    echo "Git 리포지토리 클론 중..."
    # TODO: 실제 Git 리포지토리 URL로 변경
    # git clone https://github.com/your-username/trip_flow.git .
    echo "수동으로 코드를 업로드하거나 Git 리포지토리를 클론하세요."
else
    echo "Git 리포지토리 업데이트 중..."
    git pull origin main
fi

# 환경 변수 파일 확인
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production 파일이 없습니다."
    echo "다음 명령어로 파일을 생성하세요:"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production"
    exit 1
fi

# Docker Compose로 배포
echo "Docker 이미지 빌드 및 컨테이너 시작 중..."
docker compose --env-file .env.production down
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d

echo "=== 배포 완료 ==="
echo "애플리케이션 상태 확인: docker compose ps"
echo "로그 확인: docker compose logs -f"
EOF

chmod +x /opt/trip_flow/deploy.sh
chown ubuntu:ubuntu /opt/trip_flow/deploy.sh

# 자동 시작 스크립트 (재부팅 시)
cat > /etc/systemd/system/trip-flow.service << 'EOF'
[Unit]
Description=Trip Flow Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/trip_flow
ExecStart=/usr/local/bin/docker-compose --env-file .env.production up -d
ExecStop=/usr/local/bin/docker-compose --env-file .env.production down
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# 서비스 등록 (처음에는 비활성화 - 수동 배포 후 활성화)
systemctl daemon-reload
# systemctl enable trip-flow.service

# Swap 메모리 설정 (t2.micro는 1GB RAM만 있으므로)
echo "=== Swap 메모리 설정 중... ==="
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "vm.swappiness=10" >> /etc/sysctl.conf
    sysctl -p
fi

# 완료 메시지
cat > /home/ubuntu/README.txt << 'EOF'
=== Trip Flow EC2 서버 설정 완료 ===

다음 단계를 진행하세요:

1. 애플리케이션 코드 업로드
   - Git을 사용하는 경우:
     cd /opt/trip_flow
     git clone https://github.com/your-username/trip_flow.git .
   
   - 또는 scp로 파일 전송:
     scp -r ./trip_flow ubuntu@<SERVER_IP>:/opt/

2. 환경 변수 설정
   cd /opt/trip_flow
   cp .env.production.example .env.production
   nano .env.production
   (실제 값으로 수정)

3. 애플리케이션 배포
   cd /opt/trip_flow
   ./deploy.sh

4. 상태 확인
   docker compose ps
   docker compose logs -f

5. 자동 시작 활성화 (선택사항)
   sudo systemctl enable trip-flow.service

도움말:
- 로그 확인: docker compose logs -f [service_name]
- 재시작: docker compose restart
- 중지: docker compose down
- 재배포: ./deploy.sh

문제가 있으면 /var/log/user-data.log를 확인하세요.
EOF

chown ubuntu:ubuntu /home/ubuntu/README.txt

echo "=== 초기화 완료 ==="
echo "자세한 내용은 /home/ubuntu/README.txt를 확인하세요."
