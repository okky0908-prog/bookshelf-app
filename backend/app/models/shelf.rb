class Shelf < ApplicationRecord
  # 書籍が残っている本棚は削除できない（外部キーは RESTRICT。docs/database.md 4.2）
  has_many :books, dependent: :restrict_with_error

  normalizes :name, with: ->(name) { name.squish }

  validates :name, presence: true, length: { maximum: 50 }
end
