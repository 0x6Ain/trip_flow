# ===========================================
# SNS Topic (알림 수신)
# ===========================================
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"

  tags = {
    Name = "${var.project_name}-alerts"
  }
}

resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "jinpods@gmail.com"
}

# ===========================================
# CloudWatch Alarm: CPU 사용률 80% 초과
# ===========================================
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU 사용률이 80%를 초과했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.backend.id
  }

  tags = {
    Name = "${var.project_name}-cpu-high"
  }
}

# ===========================================
# CloudWatch Alarm: 상태 체크 실패 (인스턴스 다운)
# ===========================================
resource "aws_cloudwatch_metric_alarm" "status_check" {
  alarm_name          = "${var.project_name}-status-check-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "EC2 인스턴스 상태 체크가 실패했습니다 (인스턴스 다운 가능)"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.backend.id
  }

  tags = {
    Name = "${var.project_name}-status-check"
  }
}

# ===========================================
# CloudWatch Alarm: 네트워크 트래픽 급증 (DDoS/비정상 트래픽 감지)
# ===========================================
resource "aws_cloudwatch_metric_alarm" "network_in_high" {
  alarm_name          = "${var.project_name}-network-in-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "NetworkIn"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 100000000 # 100MB/5분
  alarm_description   = "EC2 네트워크 수신 트래픽이 비정상적으로 높습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.backend.id
  }

  tags = {
    Name = "${var.project_name}-network-in-high"
  }
}
