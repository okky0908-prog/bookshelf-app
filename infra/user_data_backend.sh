#!/bin/bash
# バックエンドのサーバーの初期設定（docs/infrastructure.md）
# EC2 を作ったときに1回だけ実行される。アプリ本体（Docker イメージ）と接続情報は deploy.sh が配置する
# Terraform の templatefile で読み込むため、$${...} は Terraform の値の埋め込みになる（シェルの変数は $VAR の形で書く）
set -eux

timedatectl set-timezone Asia/Tokyo

# Rails は Docker で動かす（Amazon Linux 2023 には Ruby 4.0 のパッケージがないため）
dnf install -y docker
systemctl enable --now docker
usermod -aG docker ec2-user

# メモリ（1GB）不足への安全弁として、1GB のスワップファイルを作る
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 接続情報（backend.env）を置く場所。deploy.sh が書き込む
mkdir -p /opt/bookshelf
chown ec2-user:ec2-user /opt/bookshelf
chmod 700 /opt/bookshelf

# 止め忘れで無料利用枠（2台合計で月750時間）を超えないよう、毎日決まった時刻に停止する
# （instance_initiated_shutdown_behavior = "stop" のため、OS の電源を切ると EC2 は「停止」になる）
cat > /etc/systemd/system/bookshelf-auto-stop.service << 'EOF'
[Unit]
Description=Stop this EC2 instance every night to stay within the free tier

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl poweroff
EOF

cat > /etc/systemd/system/bookshelf-auto-stop.timer << 'EOF'
[Unit]
Description=Stop this EC2 instance every day at ${auto_stop_time} (Asia/Tokyo)

[Timer]
OnCalendar=*-*-* ${auto_stop_time}:00 Asia/Tokyo

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now bookshelf-auto-stop.timer
