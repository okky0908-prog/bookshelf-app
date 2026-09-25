# 書籍とタグの中間テーブル（docs/database.md 3.4）
class CreateBookTags < ActiveRecord::Migration[8.1]
  def change
    create_table :book_tags do |t|
      # book_id の外部キー用のインデックスは (book_id, tag_id) の一意インデックスで代用する
      t.references :book, null: false, index: false, foreign_key: { on_delete: :cascade }
      t.references :tag, null: false, foreign_key: { on_delete: :cascade }

      t.timestamps

      t.index [ :book_id, :tag_id ], unique: true
    end
  end
end
