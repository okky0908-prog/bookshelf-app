require "rails_helper"

RSpec.describe Book, type: :model do
  describe "初期値" do
    it "ステータスを省略すると未読になる" do
      expect(create(:book).status).to eq "unread"
    end
  end

  describe "入力チェック" do
    def errors_for(book)
      book.validate
      book.errors.full_messages
    end

    it "タイトルがあれば有効" do
      expect(build(:book)).to be_valid
    end

    it "タイトルが空白だけなら無効" do
      expect(errors_for(build(:book, title: "  "))).to eq [ "タイトルを入力してください" ]
    end

    it "タイトルは255文字まで" do
      expect(build(:book, title: "あ" * 255)).to be_valid
      expect(errors_for(build(:book, title: "あ" * 256))).to eq [ "タイトルは255文字以内で入力してください" ]
    end

    it "著者名は255文字まで" do
      expect(errors_for(build(:book, author: "あ" * 256))).to eq [ "著者名は255文字以内で入力してください" ]
    end

    it "著者名・書影URL・感想メモが空文字なら nil にする" do
      book = build(:book, author: " ", cover_image_url: "", memo: "")
      expect([ book.author, book.cover_image_url, book.memo ]).to eq [ nil, nil, nil ]
    end

    it "書影URLは http:// または https:// で始まる" do
      expect(build(:book, cover_image_url: "https://example.com/a.jpg")).to be_valid
      expect(build(:book, cover_image_url: "http://example.com/a.jpg")).to be_valid
      expect(errors_for(build(:book, cover_image_url: "ftp://example.com/a.jpg")))
        .to eq [ "書影URLは http:// または https:// で始まるURLを入力してください" ]
    end

    it "書影URLは2048文字まで" do
      url = "https://example.com/#{"a" * 2028}"
      expect(build(:book, cover_image_url: url)).to be_valid
      expect(errors_for(build(:book, cover_image_url: "#{url}a"))).to eq [ "書影URLは2048文字以内で入力してください" ]
    end

    it "感想メモは10,000文字まで" do
      expect(build(:book, memo: "あ" * 10_000)).to be_valid
      expect(errors_for(build(:book, memo: "あ" * 10_001))).to eq [ "感想メモは10000文字以内で入力してください" ]
    end

    it "ステータスは unread・reading・done のいずれか" do
      expect(errors_for(build(:book, status: "archived"))).to eq [ "ステータスは一覧にありません" ]
    end

    it "評価は1〜5の整数" do
      expect(build(:book, :done, rating: 1)).to be_valid
      expect(build(:book, :done, rating: 5)).to be_valid
      expect(build(:book, :done, rating: nil)).to be_valid
      expect(errors_for(build(:book, :done, rating: 0))).to eq [ "評価は1〜5で入力してください" ]
      expect(errors_for(build(:book, :done, rating: 6))).to eq [ "評価は1〜5で入力してください" ]
      expect(errors_for(build(:book, :done, rating: "2.5"))).to eq [ "評価は1〜5で入力してください" ]
    end

    context "ステータスと日付・評価の組み合わせ（docs/api.md 5.2）" do
      it "読了でなければ完了日を持てない" do
        expect(errors_for(build(:book, :reading, finished_on: Date.new(2026, 9, 10))))
          .to eq [ "完了日は読了の書籍のみ入力できます" ]
      end

      it "読了でなければ評価を持てない" do
        expect(errors_for(build(:book, :reading, rating: 3))).to eq [ "評価は読了の書籍のみ入力できます" ]
      end

      it "未読なら読書開始日を持てない" do
        expect(errors_for(build(:book, started_on: Date.new(2026, 9, 1))))
          .to eq [ "読書開始日は未読の書籍には入力できません" ]
      end

      it "読了なら完了日・評価が空でもよい" do
        expect(build(:book, :done, finished_on: nil, rating: nil)).to be_valid
      end

      it "未読から直接読了にした場合、読書開始日が空でもよい" do
        expect(build(:book, :done, started_on: nil)).to be_valid
      end
    end
  end

  describe "並び順（position）" do
    let(:shelf) { create(:shelf) }

    it "新しく登録した書籍は、同じ本棚・同じステータスの列の末尾に置く" do
      first = create(:book, shelf:)
      second = create(:book, shelf:)
      reading = create(:book, :reading, shelf:)
      other_shelf = create(:book)

      expect([ first.position, second.position ]).to eq [ 1, 2 ]
      expect(reading.position).to eq 1
      expect(other_shelf.position).to eq 1
    end

    it "position を指定した場合はその値を使う" do
      expect(create(:book, shelf:, position: 5).position).to eq 5
    end
  end

  describe "タグ" do
    it "付けた順に並ぶ" do
      book = create(:book)
      later = create(:tag, name: "あとで作ったタグ")
      earlier = create(:tag, name: "先に作ったタグ")
      book.tags << later
      book.tags << earlier

      expect(book.reload.tags).to eq [ later, earlier ]
    end

    it "書籍を削除すると、タグ付けも消える（タグは残る）" do
      book = create(:book)
      tag = create(:tag)
      book.tags << tag

      expect { book.destroy }.to change(BookTag, :count).by(-1)
      expect(Tag.exists?(tag.id)).to be true
    end
  end

  describe "DBのCHECK制約（docs/database.md 4.1）" do
    let(:book) { create(:book) }

    it "ステータスは3種類に限る" do
      expect { book.update_columns(status: "archived") }.to raise_error(ActiveRecord::StatementInvalid, /chk_books_status/)
    end

    it "評価は1〜5に限る" do
      done = create(:book, :done)
      expect { done.update_columns(rating: 6) }.to raise_error(ActiveRecord::StatementInvalid, /chk_books_rating/)
    end

    it "完了日・評価は読了の書籍だけが持つ" do
      expect { book.update_columns(rating: 3) }.to raise_error(ActiveRecord::StatementInvalid, /chk_books_done_only/)
    end

    it "未読の書籍は読書開始日を持たない" do
      expect { book.update_columns(started_on: Date.new(2026, 9, 1)) }
        .to raise_error(ActiveRecord::StatementInvalid, /chk_books_unread_no_start/)
    end
  end
end
