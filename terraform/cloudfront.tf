# CloudFront Origin Access Identity (S3 버킷을 CloudFront를 통해서만 접근)
resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "${var.project_name} Frontend OAI"
}

# S3 Bucket Policy 업데이트 (CloudFront만 접근 가능)
resource "aws_s3_bucket_policy" "frontend_cloudfront" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.frontend.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })

  depends_on = [
    aws_s3_bucket_public_access_block.frontend,
    aws_cloudfront_origin_access_identity.frontend
  ]
}

# CloudFront Function: SPA 라우팅 (S3 요청에만 적용)
# 파일 확장자가 없는 경로를 /index.html로 리라이트
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.project_name}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite SPA routes to /index.html"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // 파일 확장자가 있으면 그대로 전달 (js, css, png, svg 등)
      if (uri.includes('.')) {
        return request;
      }

      // 루트 경로는 그대로
      if (uri === '/') {
        return request;
      }

      // 그 외 경로는 /index.html로 리라이트 (SPA 라우팅)
      request.uri = '/index.html';
      return request;
    }
  EOF
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} Frontend Distribution"
  default_root_object = "index.html"
  price_class         = "PriceClass_200" # 미국, 유럽, 아시아

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  # 커스텀 도메인 (www 포함)
  aliases = [var.domain_name, "www.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true

    # SPA 라우팅을 위한 CloudFront Function
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # custom_error_response 제거됨
  # SPA 라우팅은 CloudFront Function(spa_rewrite)이 처리
  # API 요청의 403/404 에러가 index.html로 치환되는 문제 해결

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontend.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.project_name}-frontend-cdn"
  }
}
