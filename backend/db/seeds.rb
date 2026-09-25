# 初期データ（docs/database.md 8章）
# 何度実行しても同じ結果になるようにする

# 最初に起動したとき、本棚「本棚」を1つ作成する
Shelf.create!(name: "本棚") unless Shelf.exists?
