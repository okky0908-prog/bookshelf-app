output "app_url" {
  description = "アプリのURL（フロントエンドのサーバーの公開IP。EC2を起動するたびに変わる）"
  value       = "http://${aws_instance.frontend.public_ip}/"
}

output "frontend_instance_id" {
  description = "フロントエンドのサーバー（EC2）のID"
  value       = aws_instance.frontend.id
}

output "backend_instance_id" {
  description = "バックエンドのサーバー（EC2）のID"
  value       = aws_instance.backend.id
}

output "frontend_public_ip" {
  description = "フロントエンドのサーバーの公開IP（EC2を起動するたびに変わる）"
  value       = aws_instance.frontend.public_ip
}

output "backend_public_ip" {
  description = "バックエンドのサーバーの公開IP（SSH用。EC2を起動するたびに変わる）"
  value       = aws_instance.backend.public_ip
}

output "backend_private_ip" {
  description = "バックエンドのサーバーのプライベートIP（nginx の中継先。止めても変わらない）"
  value       = aws_instance.backend.private_ip
}

output "rds_endpoint" {
  description = "RDSのエンドポイント（ホスト名:ポート）。バックエンドのサーバーからだけ接続できる"
  value       = aws_db_instance.this.endpoint
}

output "db_name" {
  description = "RDSのデータベース名"
  value       = aws_db_instance.this.db_name
}

output "db_username" {
  description = "RDSの管理者ユーザー名"
  value       = aws_db_instance.this.username
  sensitive   = true
}

output "basic_auth_user" {
  description = "画面のBasic認証のユーザー名"
  value       = var.basic_auth_user
}
