# 読書記録アプリ（本棚アプリ）

個人の読書記録を管理する、シンプルな本棚Webアプリケーション。スクール課題（初級編最終課題）として、指定技術スタック（Next.js / Ruby on Rails / MySQL）での要件定義〜設計〜実装を一人で経験することを主目的に開発している。

想定利用者は開発者本人のみ（1ユーザー）で、ログイン・認証機能は持たない。詳細は[要件定義書](docs/requirements.md)を参照。

## 主な機能（MVP予定）

- 書籍の登録・編集・削除
- ステータス管理（未読／読書中／読了）、カンバン風のドラッグ&ドロップによるステータス変更
- 読了時の完了日入力
- 1ヶ月単位の読書量集計（指定月の読了冊数＋直近12ヶ月のグラフ）
- 評価（星1〜5、読了時のみ）・感想メモの記録
- 複数の本棚（カテゴリ別の本棚の作成・切り替え、書籍の本棚間移動）
- タグによるジャンル分類
- 書籍の検索・絞り込み（タイトル・著者名のキーワード、タグ）

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16（App Router、React 19） + TypeScript 6.0 + Tailwind CSS 4 / TanStack Query・dnd-kit・Recharts |
| バックエンド | Ruby 4.0 + Ruby on Rails 8.1（APIモード） |
| データベース | MySQL 8.4 |
| 開発環境 | Docker Compose（ローカルのみ） / GitHub Actions（CI） |

前回のTrello風アプリ（Java/Spring Boot + React/Vite + PostgreSQL）とは異なる技術スタックとする方針で選定した。バージョン・ライブラリの詳細と選定理由は[技術スタック詳細](docs/tech-stack.md)を参照。

## ディレクトリ構成

```
.
├── frontend/     # Next.js フロントエンド
├── backend/      # Ruby on Rails バックエンド（API）
├── docs/         # 要件定義・設計ドキュメント
├── compose.yaml  # 開発環境（Docker Compose）
└── .github/      # CI（GitHub Actions）
```

## 開発環境の起動

必要なもの：Docker（Docker Compose）

```bash
cp .env.example .env      # 初回のみ。DB のパスワードなどを設定する
docker compose up         # db / backend / frontend を起動する
```

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:3000 |
| バックエンド（API） | http://localhost:3001/api （稼働確認：http://localhost:3001/up） |
| MySQL | localhost:3306（`.env` の `DB_PORT` で変更可） |

- backend は起動時に `bin/rails db:prepare` を実行し、データベースを作成・更新する
- データは Docker のボリューム（`db-data`）に保存される。削除する場合は `docker compose down -v`

よく使うコマンド：

| 内容 | コマンド |
|---|---|
| Rails のテスト | `docker compose exec backend bundle exec rspec` |
| Rails のコードチェック | `docker compose exec backend bin/rubocop` |
| Rails のコンソール | `docker compose exec backend bin/rails console` |
| フロントエンドのテスト | `docker compose exec frontend npm test` |
| フロントエンドのコードチェック | `docker compose exec frontend npm run lint` |
| gem・npm パッケージを追加したあと | `docker compose build` を実行してから `docker compose up` |

### エディタ（VS Code）の準備

リポジトリを開くと、推奨の拡張機能（Prettier・ESLint・Tailwind CSS・Ruby LSP）のインストールが提案される。保存時に frontend のファイルは Prettier、backend の Ruby のファイルは RuboCop で整形される（`.vscode/settings.json`）。

Ruby LSP を使うには、Mac 側にも Ruby と gem を入れる（アプリの実行には不要。Docker の中で動く）。

```bash
brew install rbenv ruby-build libyaml openssl@3 mysql-client@8.4
rbenv install 4.0.7       # backend/.ruby-version と同じバージョン
cd backend
bundle config set --local build.mysql2 "--with-mysql-config=$(brew --prefix mysql-client@8.4)/bin/mysql_config"
bundle install
```

`~/.zshrc` に `eval "$(rbenv init - zsh)"` を追記しておく。

PR を作成すると、GitHub Actions で frontend（Prettier・ESLint・型チェック・Vitest・ビルド）と backend（RuboCop・RSpec）のチェックが実行される。

## 現在の進捗状況

- [x] 要件定義書（ドラフト）作成
- [x] 要件定義の確定（機能要件・非機能要件）
- [x] 基本設計
  - [x] 画面設計（[screens.md](docs/screens.md)）・モックアップ確認済み
  - [x] DB設計（[database.md](docs/database.md)）
  - [x] API設計（[api.md](docs/api.md)）
  - [x] 技術スタック詳細（[tech-stack.md](docs/tech-stack.md)）
- [x] フロントエンド／バックエンドの環境構築
- [ ] 実装

## 開発ルール

Issue作成 → ブランチ作成 → コミット → PR作成の運用ルールは[CLAUDE.md](CLAUDE.md)を参照。
