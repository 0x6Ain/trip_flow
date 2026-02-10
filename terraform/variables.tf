variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2" # 서울 리전
}

variable "aws_profile" {
  description = "AWS CLI 프로필 이름"
  type        = string
  default     = "default"
}

variable "domain_name" {
  description = "메인 도메인 이름"
  type        = string
  default     = "trip-flow.cloud"
}

variable "project_name" {
  description = "프로젝트 이름"
  type        = string
  default     = "trip-flow"
}

variable "environment" {
  description = "환경 (dev, staging, production)"
  type        = string
  default     = "production"
}

# VPC 설정
variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

# EC2 설정
variable "ec2_instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.small"
}

variable "ec2_ami" {
  description = "EC2 AMI ID (Ubuntu 22.04 LTS)"
  type        = string
  default     = "ami-0c9c942bd7bf113a2" # Ubuntu 22.04 LTS ap-northeast-2
}

variable "key_pair_name" {
  description = "EC2 키페어 이름"
  type        = string
}

# Database 설정 (Docker PostgreSQL)
variable "db_name" {
  description = "데이터베이스 이름"
  type        = string
  default     = "trip_flow"
}

variable "db_username" {
  description = "데이터베이스 사용자명"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "데이터베이스 비밀번호"
  type        = string
  sensitive   = true
}

# S3 설정
variable "s3_bucket_name" {
  description = "프론트엔드 S3 버킷 이름"
  type        = string
}

# 태그
variable "tags" {
  description = "리소스 태그"
  type        = map(string)
  default = {
    Project     = "trip-flow"
    ManagedBy   = "terraform"
  }
}
