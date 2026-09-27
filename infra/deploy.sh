#!/bin/bash
# ローカル（Mac）でフロントエンド・バックエンドをビルドし、AWS の EC2 にデプロイする（docs/infrastructure.md）
# Terraform の一部ではない。`terraform apply` で EC2・RDS を作り、EC2 が起動していることが前提
# EC2 はメモリが少ないため、ビルドはすべてローカルで行い、成果物だけを配置する
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INFRA_DIR="${SCRIPT_DIR}"
SSH_KEY="${HOME}/.ssh/bookshelf-aws-ec2"
IMAGE="bookshelf-backend:latest"

# terraform.tfvars から値を読む（例：db_password = "..."）
tfvar() {
  grep "^$1[[:space:]]*=" "${INFRA_DIR}/terraform.tfvars" | sed -E 's/^[^=]+=[[:space:]]*"(.*)"[[:space:]]*(#.*)?$/\1/'
}

echo "==> Terraform の出力値を取得"
FRONTEND_IP="$(terraform -chdir="${INFRA_DIR}" output -raw frontend_public_ip)"
BACKEND_IP="$(terraform -chdir="${INFRA_DIR}" output -raw backend_public_ip)"
RDS_ENDPOINT="$(terraform -chdir="${INFRA_DIR}" output -raw rds_endpoint)"
DB_NAME="$(terraform -chdir="${INFRA_DIR}" output -raw db_name)"
DB_USERNAME="$(terraform -chdir="${INFRA_DIR}" output -raw db_username)"
BASIC_AUTH_USER="$(terraform -chdir="${INFRA_DIR}" output -raw basic_auth_user)"
DB_HOST="${RDS_ENDPOINT%%:*}"
DB_PORT="${RDS_ENDPOINT##*:}"
DB_PASSWORD="$(tfvar db_password)"
BASIC_AUTH_PASSWORD="$(tfvar basic_auth_password)"

if [ -z "${FRONTEND_IP}" ] || [ -z "${BACKEND_IP}" ]; then
  echo "EC2 の公開IPが取得できませんでした。EC2 が起動しているか確認してください（infra/servers.sh start）。" >&2
  exit 1
fi
if [ -z "${DB_PASSWORD}" ] || [ -z "${BASIC_AUTH_PASSWORD}" ]; then
  echo "terraform.tfvars の db_password・basic_auth_password が読み取れませんでした。" >&2
  exit 1
fi

SSH_OPTS=(-i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
ssh_frontend() { ssh "${SSH_OPTS[@]}" "ec2-user@${FRONTEND_IP}" "$@"; }
ssh_backend() { ssh "${SSH_OPTS[@]}" "ec2-user@${BACKEND_IP}" "$@"; }

echo "==> EC2 の初期設定（user_data）が終わるのを待つ"
for host in "${FRONTEND_IP}" "${BACKEND_IP}"; do
  ssh "${SSH_OPTS[@]}" "ec2-user@${host}" "cloud-init status --wait > /dev/null"
done

# --- バックエンド ---

echo "==> バックエンドの Docker イメージをビルド（EC2 に合わせて linux/amd64）"
docker build --platform linux/amd64 -t "${IMAGE}" "${REPO_ROOT}/backend"

echo "==> バックエンドのイメージを EC2 へ転送"
docker save "${IMAGE}" | gzip | ssh_backend "gunzip | sudo docker load"

echo "==> RDS の接続情報（backend.env）を EC2 へ配置"
# SECRET_KEY_BASE は、初回だけ EC2 上で作り、2回目以降は同じ値を使い続ける
ssh_backend "test -f /opt/bookshelf/secret_key_base || (openssl rand -hex 64 > /opt/bookshelf/secret_key_base && chmod 600 /opt/bookshelf/secret_key_base)"
ssh_backend "umask 077 && cat > /opt/bookshelf/backend.env && echo SECRET_KEY_BASE=\$(cat /opt/bookshelf/secret_key_base) >> /opt/bookshelf/backend.env" << EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
RAILS_LOG_LEVEL=info
EOF

echo "==> バックエンドを起動（起動のたびに、マイグレーションと初期データを反映する）"
ssh_backend "sudo docker rm -f bookshelf-backend > /dev/null 2>&1 || true"
ssh_backend "sudo docker run -d --name bookshelf-backend --restart unless-stopped --env-file /opt/bookshelf/backend.env -p 3001:3001 ${IMAGE} > /dev/null"
ssh_backend "sudo docker image prune -f > /dev/null"

echo "==> バックエンドの起動を待つ"
for _ in $(seq 1 60); do
  if ssh_backend "curl -sf -o /dev/null http://localhost:3001/up"; then
    break
  fi
  sleep 2
done
ssh_backend "curl -sf -o /dev/null http://localhost:3001/up" || {
  echo "バックエンドが起動しませんでした。ログ：" >&2
  ssh_backend "sudo docker logs --tail 50 bookshelf-backend" >&2
  exit 1
}

# --- フロントエンド ---

echo "==> フロントエンドをビルド（API はフロントエンドのサーバーの /api を呼ぶ）"
(cd "${REPO_ROOT}" && docker compose run --rm --no-deps -e NEXT_PUBLIC_API_BASE_URL=/api frontend sh -c "rm -rf out && npx next build")

echo "==> フロントエンドを EC2 へ配置"
tar -C "${REPO_ROOT}/frontend/out" -czf - . | ssh_frontend "rm -rf /usr/share/nginx/bookshelf/* && tar -C /usr/share/nginx/bookshelf -xzf -"
rm -rf "${REPO_ROOT}/frontend/out"

echo "==> Basic 認証のパスワードを配置"
HASH="$(openssl passwd -apr1 "${BASIC_AUTH_PASSWORD}")"
echo "${BASIC_AUTH_USER}:${HASH}" | ssh_frontend "sudo tee /etc/nginx/bookshelf.htpasswd > /dev/null"
ssh_frontend "sudo nginx -t && sudo systemctl reload nginx"

# --- 動作確認 ---

echo "==> 動作確認"
APP_URL="http://${FRONTEND_IP}"
echo "--- パスワードなし（401 になれば正しい）"
curl -sS -m 10 -o /dev/null -w "HTTPステータス: %{http_code}\n" "${APP_URL}/"
echo "--- 画面"
curl -sS -m 10 -u "${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}" -o /dev/null -w "HTTPステータス: %{http_code}\n" "${APP_URL}/"
echo "--- API（/api/shelves）"
curl -sS -m 10 -u "${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}" "${APP_URL}/api/shelves" | head -c 300
echo
echo "==> 完了: ${APP_URL}/ （ユーザー名: ${BASIC_AUTH_USER}）"
