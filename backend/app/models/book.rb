class Book < ApplicationRecord
  # 本棚がないときのエラーは、APIで受け取る項目名（shelf_id）に付ける（docs/api.md API-08）
  belongs_to :shelf, optional: true
  # タグは付けた順に並べる（docs/api.md 3.3）
  has_many :book_tags, -> { order(:id) }, dependent: :destroy
  has_many :tags, through: :book_tags

  enum :status, { unread: "unread", reading: "reading", done: "done" }, validate: true

  normalizes :title, with: ->(title) { title.squish }
  normalizes :author, :cover_image_url, with: ->(value) { value.strip.presence }
  normalizes :memo, with: ->(memo) { memo.presence }

  validate :shelf_must_exist
  validates :title, presence: true, length: { maximum: 255 }
  validates :author, length: { maximum: 255 }
  # URL 全体が「http:// または https:// ＋空白を含まない文字列」であることを確かめる（先頭だけだと、途中に改行などがあっても通る）
  validates :cover_image_url, length: { maximum: 2048 },
                              format: { with: %r{\Ahttps?://\S+\z}, message: :http_url, allow_nil: true }
  validates :memo, length: { maximum: 10_000 }
  validates :rating, numericality: { only_integer: true, in: 1..5, allow_nil: true, message: :rating_range }
  # 状態ごとに持てる項目の組み合わせ（docs/database.md 4.1、docs/api.md 5.2）
  validates :finished_on, absence: { message: :only_done }, unless: :done?
  validates :rating, absence: { message: :only_done }, unless: :done?
  validates :started_on, absence: { message: :unread_no_start }, if: :unread?
  validate :tag_names_must_be_short, if: -> { @tag_names }

  # 並び順（docs/database.md 5章）
  # 新しく登録した書籍や、本棚・ステータスが変わった書籍は、移動先の列の末尾に置き、移動元の列を詰める
  # 並び順を変える前に、関係する本棚の行をロックする（下の lock_shelves を参照）
  # どちらも保存・削除のトランザクションの中で、並び順を変える処理より前に呼ばれる
  before_validation :lock_shelves
  before_destroy :lock_shelves
  before_validation :append_to_column, on: :create, if: -> { position.nil? && shelf && status }
  before_update :append_to_column, if: :column_changing?
  after_update :compact_previous_column, if: :column_changed?
  after_destroy :compact_column
  after_save :replace_tags, if: -> { @tag_names }
  # 書籍を削除したら、どの書籍にも付いていないタグも削除する。
  # タグ付け（book_tags）は dependent: :destroy で先に消えるため、その前に付いていたタグを覚えておく
  before_destroy :remember_tag_ids, prepend: true
  after_destroy -> { Tag.delete_unused(@tag_ids_before_destroy) }

  scope :in_column, ->(shelf_id, status) { where(shelf_id:, status:) }

  # 書籍を並べた順に、position を 1 から振り直す
  def self.renumber(books)
    books.each.with_index(1) do |book, position|
      book.update_column(:position, position) unless book.position == position
    end
  end

  # 書籍のタグを、タグ名の配列の内容に置き換える（保存時に反映する。docs/api.md 5.1）
  attr_reader :tag_names

  def tag_names=(names)
    @tag_names = Array(names).map { it.to_s.squish }.compact_blank
  end

  # ドラッグ&ドロップで、列（ステータス）と列の中の位置を変える（docs/api.md API-09）
  # position を省略した場合、または列の冊数より大きい場合は末尾に置く
  def move_to!(status:, position: nil)
    errors.clear
    errors.add(:status, status.blank? ? :blank : :inclusion) unless self.class.statuses.key?(status)
    unless position.nil? || (position.is_a?(Integer) && position >= 1)
      errors.add(:position, :greater_than_or_equal_to, count: 1)
    end
    raise ActiveRecord::RecordInvalid, self if errors.any?

    transaction do
      lock_shelves
      change_status(status) unless self.status == status
      save!
      others = self.class.in_column(shelf_id, self.status).where.not(id:).lock.order(:position, :id).to_a
      index = position ? (position - 1).clamp(0, others.size) : others.size
      self.class.renumber(others.insert(index, self))
    end
  end

  private

  # ステータスを変えたときの日付・評価の更新（docs/database.md 6章）
  # 並び順の振り直しが同時に行われても、デッドロックにならないようにする（docs/database.md 5章）
  # 書籍の行をロックする前に、関係する本棚（移動元・移動先）の行を、いつも同じ順番（ID の昇順）でロックする。
  # 同じ本棚の並び順を変える操作は、1つずつ順番に行われる
  def lock_shelves
    ids = [ shelf_id, shelf_id_in_database ].compact.uniq.sort
    Shelf.where(id: ids).order(:id).lock.load if ids.any?
  end

  def change_status(new_status)
    today = Date.current
    case new_status
    when "reading"
      self.started_on ||= today
      self.finished_on = nil
      self.rating = nil
    when "done"
      self.finished_on = today
    when "unread"
      self.started_on = nil
      self.finished_on = nil
      self.rating = nil
    end
    self.status = new_status
  end

  def shelf_must_exist
    return if shelf

    errors.add(:shelf_id, shelf_id.nil? ? :blank : :not_found)
  end

  def tag_names_must_be_short
    return unless @tag_names.any? { it.length > 30 }

    errors.add(:tag_names, :too_long, count: 30)
  end

  def column_changing?
    will_save_change_to_shelf_id? || will_save_change_to_status?
  end

  def column_changed?
    saved_change_to_shelf_id? || saved_change_to_status?
  end

  def append_to_column
    self.position = self.class.in_column(shelf_id, status).lock.maximum(:position).to_i + 1
  end

  def compact_previous_column
    compact(shelf_id_before_last_save, status_before_last_save)
  end

  def compact_column
    compact(shelf_id, status)
  end

  def compact(shelf_id, status)
    self.class.renumber(self.class.in_column(shelf_id, status).lock.order(:position, :id).to_a)
  end

  # 外したタグが、どの書籍にも付いていなければ削除する
  def replace_tags
    previous_ids = tag_ids
    self.tags = @tag_names.map { Tag.find_or_create_by_name!(it) }.uniq
    Tag.delete_unused(previous_ids - tag_ids)
    @tag_names = nil
  end

  def remember_tag_ids
    @tag_ids_before_destroy = tag_ids
  end
end
