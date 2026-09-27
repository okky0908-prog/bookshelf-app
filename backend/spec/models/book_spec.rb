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

    it "書影URLは、途中に空白や改行を含んだり、https:// だけだったりすると無効" do
      [ "https://example.com/a b.jpg", "https://example.com/a.jpg\njavascript:alert(1)", "https://" ].each do |url|
        expect(errors_for(build(:book, cover_image_url: url)))
          .to eq([ "書影URLは http:// または https:// で始まるURLを入力してください" ]), url
      end
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

    it "本棚を変えると、移動先の列の末尾に置き、移動元の列を詰める" do
      first, second, third = create_list(:book, 3, shelf:)
      other = create(:shelf)
      create(:book, shelf: other)

      second.update!(shelf: other)

      expect(second.reload.position).to eq 2
      expect([ first.reload.position, third.reload.position ]).to eq [ 1, 2 ]
    end

    it "ステータスを変えると、移動先の列の末尾に置き、移動元の列を詰める" do
      first, second = create_list(:book, 2, shelf:)
      create(:book, :reading, shelf:)

      first.update!(status: "reading", started_on: Date.new(2026, 9, 1))

      expect(first.reload.position).to eq 2
      expect(second.reload.position).to eq 1
    end

    it "削除すると、その列を詰める" do
      first, second, third = create_list(:book, 3, shelf:)

      second.destroy!

      expect([ first.reload.position, third.reload.position ]).to eq [ 1, 2 ]
    end
  end

  describe "#move_to!（docs/api.md API-09）" do
    let(:shelf) { create(:shelf) }
    let!(:unread) { create_list(:book, 3, shelf:) }
    let!(:reading) { create_list(:book, 2, :reading, shelf:) }

    def positions(books)
      books.map { it.reload.position }
    end

    it "同じ列の中で、指定した位置に並べ替える" do
      unread[2].move_to!(status: "unread", position: 1)

      expect(positions(unread)).to eq [ 2, 3, 1 ]
    end

    it "別の列の指定した位置に入れ、移動元の列を詰める" do
      unread[0].move_to!(status: "reading", position: 2)

      expect(unread[0].reload).to have_attributes(status: "reading", position: 2)
      expect(positions(reading)).to eq [ 1, 3 ]
      expect(positions(unread[1..])).to eq [ 1, 2 ]
    end

    it "position を省略した場合は末尾に置く" do
      unread[0].move_to!(status: "reading")

      expect(unread[0].reload.position).to eq 3
    end

    it "position が列の冊数より大きい場合は末尾に置く" do
      unread[0].move_to!(status: "unread", position: 99)

      expect(positions(unread)).to eq [ 3, 1, 2 ]
    end

    it "ステータスが正しくなければエラーにし、変更しない" do
      expect { unread[0].move_to!(status: "archived") }.to raise_error(ActiveRecord::RecordInvalid)
      expect(unread[0].errors.full_messages).to eq [ "ステータスは一覧にありません" ]
      expect(unread[0].reload.status).to eq "unread"
    end

    it "ステータスがなければエラーにする" do
      expect { unread[0].move_to!(status: nil) }.to raise_error(ActiveRecord::RecordInvalid)
      expect(unread[0].errors.full_messages).to eq [ "ステータスを入力してください" ]
    end

    it "position が1未満、または整数でなければエラーにする" do
      [ 0, 1.5, "1" ].each do |position|
        expect { unread[0].move_to!(status: "unread", position:) }.to raise_error(ActiveRecord::RecordInvalid)
        expect(unread[0].errors.full_messages).to eq [ "並び順は1以上の値にしてください" ]
      end
    end

    describe "ステータスを変えたときの日付・評価（docs/database.md 6章）" do
      let(:today) { Date.new(2026, 9, 27) }

      around { |example| travel_to(today) { example.run } }

      it "読書中にすると、読書開始日が空なら今日を入れ、完了日・評価を消す" do
        book = create(:book, :done, started_on: nil)
        book.move_to!(status: "reading")

        expect(book.reload).to have_attributes(started_on: today, finished_on: nil, rating: nil)
      end

      it "読書中にしても、読書開始日があれば変えない" do
        book = create(:book, :done)
        book.move_to!(status: "reading")

        expect(book.reload.started_on).to eq Date.new(2026, 9, 1)
      end

      it "読了にすると、完了日に今日を入れる（読書開始日は変えない）" do
        book = create(:book, :reading)
        book.move_to!(status: "done")

        expect(book.reload).to have_attributes(started_on: Date.new(2026, 9, 1), finished_on: today, rating: nil)
      end

      it "未読から読了にした場合、読書開始日は空のまま" do
        book = create(:book)
        book.move_to!(status: "done")

        expect(book.reload).to have_attributes(started_on: nil, finished_on: today)
      end

      it "未読にすると、日付・評価を消す（感想メモ・タグは残す）" do
        book = create(:book, :done, memo: "面白かった")
        book.tags << create(:tag)
        book.move_to!(status: "unread")

        expect(book.reload).to have_attributes(started_on: nil, finished_on: nil, rating: nil, memo: "面白かった")
        expect(book.tags.size).to eq 1
      end

      it "同じ列の中での並べ替えでは、日付・評価を変えない" do
        book = create(:book, :done)
        book.move_to!(status: "done", position: 1)

        expect(book.reload).to have_attributes(finished_on: Date.new(2026, 9, 10), rating: 4)
      end
    end
  end

  describe "本棚" do
    it "本棚がなければ shelf_id のエラーにする" do
      book = build(:book, shelf_id: 0)
      book.validate
      expect(book.errors.to_hash(true)).to eq(shelf_id: [ "本棚が見つかりません" ])
    end

    it "本棚を指定しなければ shelf_id のエラーにする" do
      book = build(:book, shelf: nil)
      book.validate
      expect(book.errors.to_hash(true)).to eq(shelf_id: [ "本棚を入力してください" ])
    end
  end

  describe "#tag_names=（docs/api.md 5.1）" do
    let(:book) { create(:book) }

    it "タグ名で、書籍のタグを置き換える" do
      book.tags << create(:tag, name: "古いタグ")
      book.update!(tag_names: [ "小説", "SF" ])

      expect(book.reload.tags.map(&:name)).to eq [ "小説", "SF" ]
    end

    it "表記ゆれを含めて同じタグがあれば、それを使う" do
      ruby = create(:tag, name: "Ruby")

      expect { book.update!(tag_names: [ "ＲＵＢＹ" ]) }.not_to change(Tag, :count)
      expect(book.reload.tags).to eq [ ruby ]
    end

    it "前後の空白を取り除き、空のものは無視し、同じタグを指す名前は1つにまとめる" do
      book.update!(tag_names: [ " 小説 ", "", "  ", "Ruby", "ruby" ])

      expect(book.reload.tags.map(&:name)).to eq [ "小説", "Ruby" ]
    end

    it "空の配列ならタグをすべて外す" do
      book.tags << create(:tag)
      book.update!(tag_names: [])

      expect(book.reload.tags).to be_empty
    end

    it "外したタグが、どの書籍にも付いていなければ削除する" do
      book.update!(tag_names: [ "小説", "打ち間違い" ])

      expect { book.update!(tag_names: [ "小説" ]) }.to change(Tag, :count).by(-1)
      expect(Tag.pluck(:name)).to eq [ "小説" ]
    end

    it "外したタグが、ほかの書籍に付いていれば残す" do
      book.update!(tag_names: [ "小説" ])
      create(:book).update!(tag_names: [ "小説" ])

      expect { book.update!(tag_names: []) }.not_to change(Tag, :count)
    end

    it "30文字を超えるタグ名があればエラーにし、タグを作らない" do
      expect { book.update(tag_names: [ "あ" * 31 ]) }.not_to change(Tag, :count)
      expect(book.errors.to_hash(true)).to eq(tag_names: [ "タグ名は30文字以内で入力してください" ])
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

    it "書籍を削除すると、タグ付けも消え、どの書籍にも付いていないタグは削除する" do
      book = create(:book)
      shared = create(:tag, name: "小説")
      only = create(:tag, name: "この本だけ")
      book.tags << shared << only
      create(:book).tags << shared

      expect { book.destroy }.to change(BookTag, :count).by(-2)
      expect(Tag.exists?(shared.id)).to be true
      expect(Tag.exists?(only.id)).to be false
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
