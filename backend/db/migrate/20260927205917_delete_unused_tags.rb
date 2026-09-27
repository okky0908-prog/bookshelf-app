# どの書籍にも付いていないタグを、自動で削除するようにした（docs/database.md 3.3）
# それまでに残っていた、どの書籍にも付いていないタグをまとめて削除する
class DeleteUnusedTags < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL
      DELETE FROM tags
      WHERE NOT EXISTS (SELECT 1 FROM book_tags WHERE book_tags.tag_id = tags.id)
    SQL
  end

  # 削除したタグは戻せない（どの書籍にも付いていないため、戻す必要もない）
  def down; end
end
