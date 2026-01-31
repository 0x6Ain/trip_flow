output "instance_id" {
  description = "EC2 인스턴스 ID"
  value       = aws_instance.trip_flow.id
}

output "instance_public_ip" {
  description = "EC2 인스턴스 퍼블릭 IP"
  value       = aws_instance.trip_flow.public_ip
}

output "instance_public_dns" {
  description = "EC2 인스턴스 퍼블릭 DNS"
  value       = aws_instance.trip_flow.public_dns
}

output "elastic_ip" {
  description = "Elastic IP (사용하는 경우)"
  value       = var.use_elastic_ip ? aws_eip.trip_flow[0].public_ip : null
}

output "security_group_id" {
  description = "Security Group ID"
  value       = aws_security_group.trip_flow.id
}

output "ssh_connection_command" {
  description = "SSH 연결 명령어"
  value       = "ssh -i ~/.ssh/your-key.pem ubuntu@${var.use_elastic_ip ? aws_eip.trip_flow[0].public_ip : aws_instance.trip_flow.public_ip}"
}

output "application_url" {
  description = "애플리케이션 URL"
  value       = "http://${var.use_elastic_ip ? aws_eip.trip_flow[0].public_ip : aws_instance.trip_flow.public_ip}"
}
