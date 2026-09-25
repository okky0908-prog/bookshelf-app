# 書籍（docs/database.md 3.2・4章）
class CreateBooks < ActiveRecord::Migration[8.1]
  def change
    create_table :books do |t|
      # 外部キー用のインデックスは (shelf_id, status, position) の複合インデックスで代用する
      t.references :shelf, null: false, index: false, foreign_key: { on_delete: :restrict }
      t.string :title, null: false
      t.string :author
      t.string :cover_image_url, limit: 2048
      t.string :status, limit: 10, null: false, default: "unread"
      t.integer :position, null: false
      t.date :started_on
      t.date :finished_on
      t.integer :rating, limit: 1
      t.text :memo

      t.timestamps

      # position は振り直しの途中で一時的に重複するため、一意制約は付けない（docs/database.md 5章）
      t.index [ :shelf_id, :status, :position ]
      t.index [ :status, :finished_on ]

      t.check_constraint "status IN ('unread', 'reading', 'done')", name: "chk_books_status"
      t.check_constraint "rating IS NULL OR rating BETWEEN 1 AND 5", name: "chk_books_rating"
      t.check_constraint "status = 'done' OR (finished_on IS NULL AND rating IS NULL)", name: "chk_books_done_only"
      t.check_constraint "status <> 'unread' OR started_on IS NULL", name: "chk_books_unread_no_start"
    end
  end
end
