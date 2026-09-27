variable "aws_region" {
  description = "リソースを作成するAWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "リソース名のプレフィックス"
  type        = string
  default     = "bookshelf"
}

variable "instance_type" {
  description = "EC2のインスタンスタイプ（2台とも同じ。無料利用枠の対象に限る）"
  type        = string
  default     = "t3.micro"

  validation {
    condition     = contains(["t2.micro", "t3.micro"], var.instance_type)
    error_message = "instance_type は無料利用枠の対象（t2.micro / t3.micro）にしてください。"
  }
}

variable "rds_instance_class" {
  description = "RDSのインスタンスクラス（シングルAZ。無料利用枠の対象に限る）"
  type        = string
  default     = "db.t3.micro"

  validation {
    condition     = contains(["db.t3.micro", "db.t4g.micro"], var.rds_instance_class)
    error_message = "rds_instance_class は無料利用枠の対象（db.t3.micro / db.t4g.micro）にしてください。"
  }
}

variable "ssh_public_key" {
  description = "EC2にSSH接続するための公開鍵の中身（例: ~/.ssh/bookshelf-aws-ec2.pub の内容）"
  type        = string
}

variable "my_ip_cidr" {
  description = "SSH（22番）を許可する送信元（自分のグローバルIP/32）。HTTP（80番）は全世界に公開し、Basic認証で守る"
  type        = string

  validation {
    condition     = can(cidrhost(var.my_ip_cidr, 0)) && endswith(var.my_ip_cidr, "/32")
    error_message = "my_ip_cidr は「自分のグローバルIP/32」の形で指定してください（例: 203.0.113.1/32）。"
  }
}

variable "db_name" {
  description = "RDSに作成するデータベース名"
  type        = string
  default     = "bookshelf_production"
}

variable "db_username" {
  description = "RDSの管理者ユーザー名"
  type        = string
  default     = "bookshelf"
}

variable "db_password" {
  description = "RDSの管理者パスワード（terraform.tfvarsで設定する）"
  type        = string
  sensitive   = true

  validation {
    # RDS のパスワードに使えない文字（/ @ " と空白）を除く
    condition     = length(var.db_password) >= 12 && !can(regex("[/@\" ]", var.db_password))
    error_message = "db_password は12文字以上で、/ @ \" と空白を含まないようにしてください。"
  }
}

variable "basic_auth_user" {
  description = "画面（nginx）のBasic認証のユーザー名"
  type        = string
  default     = "bookshelf"
}

variable "basic_auth_password" {
  description = "画面（nginx）のBasic認証のパスワード（terraform.tfvarsで設定する）"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.basic_auth_password) >= 12
    error_message = "basic_auth_password は12文字以上にしてください。"
  }
}

variable "auto_stop_time" {
  description = "EC2を毎日自動で停止する時刻（日本時間、HH:MM）。止め忘れで無料利用枠（月750時間）を超えないようにする"
  type        = string
  default     = "00:00"

  validation {
    condition     = can(regex("^([01][0-9]|2[0-3]):[0-5][0-9]$", var.auto_stop_time))
    error_message = "auto_stop_time は HH:MM の形で指定してください（例: 00:00）。"
  }
}
