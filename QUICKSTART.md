# Trip Flow 빠른 시작 가이드

## 🚀 로컬에서 Docker로 실행하기

### 1. 환경 변수 설정

```bash
# 프로덕션 환경 변수 파일 생성
cp .env.production.example .env.production

# 파일 편집
nano .env.production
```

최소한 다음 값을 설정하세요:

- `SECRET_KEY`: 강력한 랜덤 키
- `GOOGLE_MAPS_API_KEY`: Google Maps API 키
- `DATABASE_PASSWORD`: 데이터베이스 비밀번호

### 2. 배포 실행

```bash
# 배포 스크립트 실행
./deploy.sh
```

### 3. 접속

브라우저에서 `http://localhost` 접속

---

## ☁️ AWS에 배포하기

### 1. SSH 키 생성

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/trip_flow_key
cat ~/.ssh/trip_flow_key.pub  # 이 내용을 복사
```

### 2. Terraform 설정

```bash
cd terraform

# 변수 파일 생성
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# ssh_public_key에 위에서 복사한 공개 키 붙여넣기
```

### 3. AWS 인프라 생성

```bash
# AWS CLI 설정 (처음 한 번만)
aws configure

# Terraform 초기화
terraform init

# 인프라 생성
terraform apply
```

생성된 IP 주소 확인:

```bash
terraform output instance_public_ip
```

### 4. 서버에 접속

```bash
ssh -i ~/.ssh/trip_flow_key ubuntu@<EC2_PUBLIC_IP>
```

### 5. 코드 업로드

#### 방법 A: Git (권장)

```bash
# 서버에서 실행
cd /opt/trip_flow
git clone https://github.com/your-username/trip_flow.git .
```

#### 방법 B: SCP

```bash
# 로컬에서 실행
scp -i ~/.ssh/trip_flow_key -r ./* ubuntu@<EC2_PUBLIC_IP>:/opt/trip_flow/
```

### 6. 환경 변수 설정 (서버에서)

```bash
cd /opt/trip_flow
cp .env.production.example .env.production
nano .env.production

# 실제 값으로 수정
```

### 7. 배포 실행 (서버에서)

```bash
./deploy.sh
```

### 8. 접속

브라우저에서 `http://<EC2_PUBLIC_IP>` 접속

---

## 📚 자세한 내용

- **배포 가이드**: `DEPLOYMENT.md` 참고
- **API 문서**: `http://localhost/_d/swagger/` 또는 `http://<EC2_PUBLIC_IP>/_d/swagger/`
- **관리자**: `http://localhost/_a/` 또는 `http://<EC2_PUBLIC_IP>/_a/`

## 🆘 문제 해결

### 로그 확인

```bash
docker compose logs -f
```

### 컨테이너 상태 확인

```bash
docker compose ps
```

### 재시작

```bash
docker compose restart
```

더 자세한 내용은 `DEPLOYMENT.md`를 참고하세요.
