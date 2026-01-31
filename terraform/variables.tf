variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2" # 서울 리전
}

variable "environment" {
  description = "환경 (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "instance_type" {
  description = "EC2 인스턴스 타입 (Free Tier: t2.micro)"
  type        = string
  default     = "t2.micro"
}

variable "create_key_pair" {
  description = "새로운 SSH 키 페어를 생성할지 여부"
  type        = bool
  default     = true
}

variable "ssh_public_key" {
  description = "SSH 공개 키 (create_key_pair가 true일 때 필요)"
  type        = string
  default     = ""
}

variable "existing_key_name" {
  description = "기존 키 페어 이름 (create_key_pair가 false일 때 사용)"
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "SSH 접근을 허용할 CIDR 블록"
  type        = list(string)
  default     = ["0.0.0.0/0"] # 보안을 위해 실제 IP로 제한하는 것을 권장
}

variable "use_elastic_ip" {
  description = "Elastic IP 사용 여부"
  type        = bool
  default     = false # Free Tier에서는 1개만 무료, 필요시 true로 변경
}

variable "project_name" {
  description = "프로젝트 이름"
  type        = string
  default     = "trip-flow"
}
