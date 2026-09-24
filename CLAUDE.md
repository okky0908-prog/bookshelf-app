# リポジトリ運用ルール（必須）

Claude Codeはこのリポジトリで作業する際、以下のワークフローを必ず守ること。
`main`ブランチへの直接コミット・直接pushは一切禁止。

## 1. 作業を始める前に、GitHub Issueを作成する

`gh issue create` で、これから行う作業を説明するIssueを作成する。

## 2. Issueに紐づくブランチを作成する

`main`から以下の命名規則でブランチを作成する。

`<type>/<issue番号>-<短い英語スラッグ>`

- `type`は `feat` `fix` `chore` `docs` `refactor` `test` のいずれか
- 例：`feat/12-add-book-form`、`fix/13-null-pointer-on-save`

## 3. そのブランチ上で作業・コミットする

コミットメッセージは通常のルールに従う（このリポジトリはCo-Authored-By規約あり）。

## 4. 作業完了後、PRを作成する

`gh pr create` で `main` 宛のPRを作成し、本文に `Closes #<Issue番号>` を含めてIssueと紐づける。

## 5. マージ

レビュー承認は必須設定にしていない（ソロ開発のため）が、CIやビルドが通ることを確認してからマージする。
