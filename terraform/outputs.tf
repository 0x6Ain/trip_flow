output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "ec2_public_ip" {
  description = "EC2 인스턴스 공용 IP"
  value       = aws_eip.backend.public_ip
}

output "ec2_instance_id" {
  description = "EC2 인스턴스 ID"
  value       = aws_instance.backend.id
}

# PostgreSQL은 EC2 내부 Docker 컨테이너로 운영
# DATABASE_HOST=localhost 사용

output "s3_bucket_name" {
  description = "S3 버킷 이름"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront 도메인 이름"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_url" {
  description = "CloudFront URL (HTTPS)"
  value       = "https://${var.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "backend_api_url" {
  description = "백엔드 API URL (Let's Encrypt HTTPS)"
  value       = "https://api.${var.domain_name}"
}

output "route53_nameservers" {
  description = "Route 53 네임서버 (도메인 등록기관에 설정 필요)"
  value       = aws_route53_zone.main.name_servers
}
