#!/bin/bash
# フロントエンドのサーバーの初期設定（docs/infrastructure.md）
# EC2 を作ったときに1回だけ実行される。画面のファイルと Basic 認証のパスワードは deploy.sh が配置する
# Terraform の templatefile で読み込むため、$${...} は Terraform の値の埋め込みになる（シェルの変数は $VAR の形で書く）
set -eux

timedatectl set-timezone Asia/Tokyo

dnf install -y nginx

# 画面のファイル（Next.js の静的ファイル）を置く場所。deploy.sh が書き込む
mkdir -p /usr/share/nginx/bookshelf
chown ec2-user:ec2-user /usr/share/nginx/bookshelf

# Basic 認証のパスワードファイル。deploy.sh が書き込むまでは空にしておき、誰も入れないようにする
install -m 640 -o root -g nginx /dev/null /etc/nginx/bookshelf.htpasswd

# nginx：画面のファイルを返し、/api はバックエンドのサーバーへ中継する。サイト全体に Basic 認証をかける
# （nginx.conf 本体は編集しない。conf.d 側で default_server にすれば、パッケージの更新で上書きされない）
cat > /etc/nginx/conf.d/bookshelf.conf << 'EOF'
server {
    listen       80 default_server;
    listen       [::]:80 default_server;
    server_name  _;
    root         /usr/share/nginx/bookshelf;
    index        index.html;

    # ログイン機能がないため、サイト全体（画面と API）をパスワードで守る
    auth_basic           "Bookshelf";
    auth_basic_user_file /etc/nginx/bookshelf.htpasswd;

    gzip       on;
    gzip_types text/css application/javascript application/json;

    # API はバックエンドのサーバー（プライベートIP）へ中継する。ブラウザからは同じサーバーに見えるため CORS はいらない
    location /api/ {
        proxy_pass         http://${backend_private_ip}:3001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # ファイル名にハッシュが付いた JS・CSS は、長くキャッシュさせる
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri.html /index.html;
    }
}
EOF

systemctl enable nginx
systemctl restart nginx

# 止め忘れで無料利用枠（2台合計で月750時間）を超えないよう、毎日決まった時刻に停止する
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
