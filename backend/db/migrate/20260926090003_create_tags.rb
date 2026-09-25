# タグ（docs/database.md 3.3）
class CreateTags < ActiveRecord::Migration[8.1]
  def change
    create_table :tags do |t|
      t.string :name, limit: 30, null: false
      # 表記ゆれはアプリ側の正規化でそろえるため、DBでは完全一致だけを見る（utf8mb4_bin）
      t.string :normalized_name, limit: 100, null: false, collation: "utf8mb4_bin"

      t.timestamps

      t.index :normalized_name, unique: true
    end
  end
end
