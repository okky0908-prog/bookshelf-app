class Tag < ApplicationRecord
  has_many :book_tags, dependent: :destroy
  has_many :books, through: :book_tags

  normalizes :name, with: ->(name) { name.squish }

  validates :name, presence: true, length: { maximum: 30 }
  validates :normalized_name, presence: true, uniqueness: { case_sensitive: true }

  before_validation { self.normalized_name = self.class.normalize_name(name) }

  # 表記ゆれを含めて同じタグがあればそれを返し、なければ作る（docs/api.md 5.1）
  def self.find_or_create_by_name!(name)
    normalized = normalize_name(name)
    # ロックを付けて読み、同じタグを削除しようとしている操作（delete_unused）が終わるのを待つ
    lock.find_by(normalized_name: normalized) || create!(name:)
  rescue ActiveRecord::RecordNotUnique
    # 同じタグを同時に作ろうとして先を越された場合は、先に作られたタグを使う
    # MySQL（REPEATABLE READ）では、ロックを付けて読むと、トランザクションの途中でもほかが作った行を読める
    lock.find_by!(normalized_name: normalized)
  end

  # 指定したタグのうち、どの書籍にも付いていないものを削除する（docs/database.md 3.3）
  # タグの行をロックしてから、ロックを付けた読み取りで使われていないことを確かめる。
  # 同じタグを付けようとしている操作と同時に行われても、付けた側のタグ付けを消さない
  def self.delete_unused(ids)
    where(id: ids).order(:id).lock.each do |tag|
      tag.destroy! unless BookTag.where(tag_id: tag.id).lock.exists?
    end
  end

  # 表記ゆれをそろえて、同じタグかどうかを判定するキーを作る（docs/database.md 3.3.1）
  # 1. 前後の空白を取り除き、連続する空白を1つにする
  # 2. NFKC で全角英数字を半角に、半角カタカナを全角にそろえる
  # 3. 英字を小文字にそろえる
  # 4. カタカナをひらがなにそろえる
  # フロントエンドの候補表示でも同じルールを使う
  def self.normalize_name(name)
    return nil if name.nil?

    name.squish.unicode_normalize(:nfkc).downcase.tr("ァ-ヶ", "ぁ-ゖ")
  end
end
