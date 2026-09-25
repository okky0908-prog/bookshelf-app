class Tag < ApplicationRecord
  has_many :book_tags, dependent: :destroy
  has_many :books, through: :book_tags

  normalizes :name, with: ->(name) { name.squish }

  validates :name, presence: true, length: { maximum: 30 }
  validates :normalized_name, presence: true, uniqueness: { case_sensitive: true }

  before_validation { self.normalized_name = self.class.normalize_name(name) }

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
