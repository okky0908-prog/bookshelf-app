class Shelf < ApplicationRecord
  # 書籍が残っている本棚は削除できない（外部キーは RESTRICT。docs/database.md 4.2）
  has_many :books, dependent: :restrict_with_error

  normalizes :name, with: ->(name) { name.squish }

  validates :name, presence: true, length: { maximum: 50 }

  # 本棚ごとの書籍の数を、1回のクエリでまとめて取得する（docs/api.md 3.3）
  scope :with_books_count, -> {
    left_joins(:books).group(:id).select("shelves.*", "COUNT(books.id) AS books_count")
  }

  def books_count
    has_attribute?(:books_count) ? self[:books_count] : books.count
  end
end
