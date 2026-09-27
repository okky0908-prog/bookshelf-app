# 本番用の Dockerfile（AWS のバックエンドのサーバーで使う。docs/infrastructure.md）
# 開発用は Dockerfile.dev

# ---- gem をインストールする段階 ----
FROM ruby:4.0-slim AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential default-libmysqlclient-dev pkg-config git libyaml-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV RAILS_ENV=production \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_WITHOUT="development:test"

COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

COPY . .
# 起動を速くするため、あらかじめ読み込み結果をキャッシュしておく
RUN bundle exec bootsnap precompile app/ lib/

# ---- 動かす段階（ビルド用のツールを含めず、小さくする） ----
FROM ruby:4.0-slim

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y default-mysql-client libyaml-0-2 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV RAILS_ENV=production \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_WITHOUT="development:test"

COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /app /app

# root ではないユーザーで動かす
RUN useradd --create-home --shell /bin/bash rails && \
    mkdir -p tmp log && chown -R rails:rails tmp log
USER rails

EXPOSE 3001

# 起動のたびに、データベースの作成・マイグレーション・初期データ（本棚「本棚」）を反映してから起動する
CMD ["bash", "-c", "rm -f tmp/pids/server.pid && bin/rails db:prepare && bin/rails server -b 0.0.0.0 -p 3001"]
