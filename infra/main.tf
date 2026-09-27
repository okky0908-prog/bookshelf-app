# 本棚アプリの本番環境（docs/infrastructure.md）
# フロントエンドのサーバー（EC2）・バックエンドのサーバー（EC2）・データベース（RDS for MySQL）を作る
# 費用は AWS の無料利用枠の範囲に収める（NAT ゲートウェイ・ロードバランサー・Elastic IP は使わない）

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project = var.project_name
    }
  }
}

# --- ネットワーク ---
# 既定の VPC・サブネットを使う（新しく VPC を作らない。Terraform を実行する IAM ユーザーにも作る権限を付けていない）

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# EC2 を置くサブネット。インスタンスタイプを使えるアベイラビリティゾーンのうち、最初のもの
data "aws_ec2_instance_type_offerings" "available" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [var.instance_type]
  }
}

data "aws_subnet" "ec2" {
  vpc_id            = data.aws_vpc.default.id
  availability_zone = sort(data.aws_ec2_instance_type_offerings.available.locations)[0]
  default_for_az    = true
}

# 最新の Amazon Linux 2023 の AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "this" {
  key_name   = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

# --- セキュリティグループ ---
# 送信元は、公開する HTTP だけを全世界にし、それ以外は自分のPC（SSH）かセキュリティグループ単位で絞る

resource "aws_security_group" "frontend" {
  name        = "${var.project_name}-frontend-sg"
  description = "Frontend: HTTP(80) from anywhere, SSH(22) from my IP only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    # スマホのモバイル回線などからも使えるように、HTTP は送信元を絞らない。代わりに nginx の Basic 認証をかける
    description = "HTTP from anywhere (protected by Basic authentication on nginx)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from my PC only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  egress {
    description = "All outbound (package installs and proxying to the backend)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-frontend-sg"
  }
}

resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Backend: Rails(3001) from the frontend SG only, SSH(22) from my IP only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    # API はインターネットに公開しない。フロントエンドのサーバーの nginx からの中継だけを受ける
    description     = "Rails API from the frontend server only"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  ingress {
    description = "SSH from my PC only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  egress {
    description = "All outbound (package installs and the database)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-backend-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "RDS: MySQL(3306) from the backend SG only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "MySQL from the backend server only"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# --- EC2 ---
# 2台とも、公開IPは自動で割り当てるもの（止めている間は課金されない。起動するたびに変わる）

resource "aws_instance" "backend" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnet.ec2.id
  vpc_security_group_ids      = [aws_security_group.backend.id]
  key_name                    = aws_key_pair.this.key_name
  associate_public_ip_address = true
  # OS からのシャットダウン（毎晩の自動停止）で、削除ではなく「停止」にする
  instance_initiated_shutdown_behavior = "stop"

  user_data = templatefile("${path.module}/user_data_backend.sh", {
    auto_stop_time = var.auto_stop_time
  })
  user_data_replace_on_change = true

  # IMDSv2（トークンを使うメタデータの取得）だけを許可する
  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-backend"
  }
}

resource "aws_instance" "frontend" {
  ami                                  = data.aws_ami.amazon_linux_2023.id
  instance_type                        = var.instance_type
  subnet_id                            = data.aws_subnet.ec2.id
  vpc_security_group_ids               = [aws_security_group.frontend.id]
  key_name                             = aws_key_pair.this.key_name
  associate_public_ip_address          = true
  instance_initiated_shutdown_behavior = "stop"

  # nginx の中継先として、バックエンドのサーバーのプライベートIP（止めても変わらない）を埋め込む
  user_data = templatefile("${path.module}/user_data_frontend.sh", {
    backend_private_ip = aws_instance.backend.private_ip
    auto_stop_time     = var.auto_stop_time
  })
  user_data_replace_on_change = true

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-frontend"
  }
}

# --- RDS（MySQL 8.4）---

# DB サブネットグループは（シングル AZ でも）異なる AZ の複数のサブネットが必要
resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project_name}-db"
  engine         = "mysql"
  engine_version = "8.4"

  instance_class    = var.rds_instance_class
  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  # 学習用の環境のため、自動バックアップは取らず、削除のときの最終スナップショットも残さない（無料枠を超えないように）
  backup_retention_period = 0
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  tags = {
    Name = "${var.project_name}-db"
  }
}
