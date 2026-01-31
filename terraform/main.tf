terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TripFlow"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC 조회 (기본 VPC 사용)
data "aws_vpc" "default" {
  default = true
}

# 서브넷 조회
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# 최신 Ubuntu 22.04 AMI 조회
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group
resource "aws_security_group" "trip_flow" {
  name_prefix = "trip-flow-${var.environment}-"
  description = "Security group for Trip Flow application"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
    description = "SSH access"
  }

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP access"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS access"
  }

  # Outbound - 모든 트래픽 허용
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "trip-flow-${var.environment}-sg"
  }
}

# Key Pair (기존 키 사용 또는 생성)
resource "aws_key_pair" "trip_flow" {
  count      = var.create_key_pair ? 1 : 0
  key_name   = "trip-flow-${var.environment}"
  public_key = var.ssh_public_key

  tags = {
    Name = "trip-flow-${var.environment}-key"
  }
}

# EC2 Instance
resource "aws_instance" "trip_flow" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  key_name               = var.create_key_pair ? aws_key_pair.trip_flow[0].key_name : var.existing_key_name
  vpc_security_group_ids = [aws_security_group.trip_flow.id]

  # Free Tier 범위 내 EBS 볼륨
  root_block_device {
    volume_size           = 30 # Free Tier: 30GB
    volume_type           = "gp2"
    delete_on_termination = true

    tags = {
      Name = "trip-flow-${var.environment}-root"
    }
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    environment = var.environment
  })

  # 상세 모니터링 비활성화 (Free Tier 초과 방지)
  monitoring = false

  tags = {
    Name = "trip-flow-${var.environment}"
  }
}

# Elastic IP (선택사항)
resource "aws_eip" "trip_flow" {
  count    = var.use_elastic_ip ? 1 : 0
  instance = aws_instance.trip_flow.id
  domain   = "vpc"

  tags = {
    Name = "trip-flow-${var.environment}-eip"
  }
}
