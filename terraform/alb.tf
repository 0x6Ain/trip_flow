# ===========================================
# ACM 인증서 (us-east-1, CloudFront용)
# ===========================================
resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method = "DNS"

  tags = {
    Name = "${var.project_name}-frontend-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "frontend" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation_cf : record.fqdn]
}

# ALB 관련 리소스는 모두 제거됨
# Let's Encrypt + Nginx로 EC2에서 직접 HTTPS 처리
