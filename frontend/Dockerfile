# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일 복사
COPY package.json pnpm-lock.yaml ./

# pnpm 설치 및 의존성 설치
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 환경 변수 설정 (빌드 타임)
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# 프로덕션 빌드
RUN pnpm run build

# Stage 2: Production
FROM nginx:alpine

# Nginx 설정 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 커스텀 Nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
