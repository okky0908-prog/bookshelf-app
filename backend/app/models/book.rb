class Book < ApplicationRecord
  belongs_to :shelf
  # タグは付けた順に並べる（docs/api.md 3.3）
  has_many :book_tags, -> { order(:id) }, dependent: :destroy
  has_many :tags, through: :book_tags

  enum :status, { unread: "unread", reading: "reading", done: "done" }, validate: true

  normalizes :title, with: ->(title) { title.squish }
  normalizes :author, :cover_image_url, with: ->(value) { value.strip.presence }
  normalizes :memo, with: ->(memo) { memo.presence }

  validates :title, presence: true, length: { maximum: 255 }
  validates :author, length: { maximum: 255 }
  validates :cover_image_url, length: { maximum: 2048 },
                              format: { with: %r{\Ahttps?://}, message: :http_url, allow_nil: true }
  validates :memo, length: { maximum: 10_000 }
  validates :rating, numericality: { only_integer: true, in: 1..5, allow_nil: true, message: :rating_range }
  # 状態ごとに持てる項目の組み合わせ（docs/database.md 4.1、docs/api.md 5.2）
  validates :finished_on, absence: { message: :only_done }, unless: :done?
  validates :rating, absence: { message: :only_done }, unless: :done?
  validates :started_on, absence: { message: :unread_no_start }, if: :unread?

  # 新しく登録した書籍は、その列（本棚・ステータス）の末尾に置く（docs/database.md 5章）
  before_validation :append_to_column, on: :create, if: -> { position.nil? && shelf && status }

  private

  def append_to_column
    self.position = Book.where(shelf:, status:).maximum(:position).to_i + 1
  end
end
