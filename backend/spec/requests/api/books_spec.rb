require "rails_helper"

RSpec.describe "書籍のAPI", type: :request do
  let(:json) { response.parsed_body }
  let(:shelf) { create(:shelf) }

  describe "GET /api/shelves/:shelf_id/books（API-05）" do
    let(:tech) { create(:tag, name: "技術書") }
    let!(:readable) do
      create(:book, shelf:, title: "リーダブルコード", author: "Dustin Boswell",
                    cover_image_url: "https://example.com/7.jpg").tap { it.tags << tech }
    end
    let!(:three_body) { create(:book, shelf:, title: "三体", author: "劉慈欣") }
    let!(:reading) { create(:book, :reading, shelf:, title: "ハッシュ") }
    let!(:done) { create(:book, :done, shelf:, title: "Ruby入門").tap { it.tags << tech } }

    before { create(:book, title: "別の本棚の三体") }

    # 1つのテストで何度もリクエストするため、json（let でメモ化される）は使わない
    def titles(status)
      response.parsed_body.dig("columns", status, "books").map { it["title"] }
    end

    it "3列に分けて、並び順どおりに書籍カードを返す" do
      get "/api/shelves/#{shelf.id}/books"

      expect(response).to have_http_status(:ok)
      expect(json).to include("shelf_id" => shelf.id, "filtered" => false)
      expect(json.dig("columns", "unread")).to eq(
        "total" => 2,
        "books" => [
          {
            "id" => readable.id, "title" => "リーダブルコード", "cover_image_url" => "https://example.com/7.jpg",
            "status" => "unread", "position" => 1, "tags" => [ { "id" => tech.id, "name" => "技術書" } ]
          },
          {
            "id" => three_body.id, "title" => "三体", "cover_image_url" => nil,
            "status" => "unread", "position" => 2, "tags" => []
          }
        ]
      )
      expect(titles("reading")).to eq [ "ハッシュ" ]
      expect(titles("done")).to eq [ "Ruby入門" ]
    end

    it "書籍がない列も空の配列で返す" do
      get "/api/shelves/#{create(:shelf).id}/books"

      expect(json["columns"]).to eq(
        "unread" => { "total" => 0, "books" => [] },
        "reading" => { "total" => 0, "books" => [] },
        "done" => { "total" => 0, "books" => [] }
      )
    end

    it "キーワードで、タイトルまたは著者名に部分一致する書籍に絞り込む（total は絞り込む前の冊数）" do
      get "/api/shelves/#{shelf.id}/books", params: { q: "boswell" }

      expect(json["filtered"]).to be true
      expect(titles("unread")).to eq [ "リーダブルコード" ]
      expect(json.dig("columns", "unread", "total")).to eq 2
      expect(titles("done")).to eq []
    end

    it "キーワードは英字の大文字・小文字、ひらがな・カタカナを区別しない" do
      get "/api/shelves/#{shelf.id}/books", params: { q: "RUBY" }
      expect(titles("done")).to eq [ "Ruby入門" ]

      get "/api/shelves/#{shelf.id}/books", params: { q: "りーだぶる" }
      expect(titles("unread")).to eq [ "リーダブルコード" ]
    end

    it "キーワードは濁点・半濁点を区別する" do
      get "/api/shelves/#{shelf.id}/books", params: { q: "ばっしゅ" }

      expect(json["columns"].values.flat_map { it["books"] }).to be_empty
    end

    it "キーワードの % や _ は、そのままの文字として探す" do
      get "/api/shelves/#{shelf.id}/books", params: { q: "%" }

      expect(json["columns"].values.flat_map { it["books"] }).to be_empty
    end

    it "タグで絞り込む" do
      get "/api/shelves/#{shelf.id}/books", params: { tag_id: tech.id }

      expect(json["filtered"]).to be true
      expect(titles("unread")).to eq [ "リーダブルコード" ]
      expect(titles("done")).to eq [ "Ruby入門" ]
    end

    it "キーワードとタグの両方に合う書籍に絞り込む" do
      get "/api/shelves/#{shelf.id}/books", params: { q: "ruby", tag_id: tech.id }

      expect(titles("unread")).to eq []
      expect(titles("done")).to eq [ "Ruby入門" ]
    end

    it "存在しないタグなら0件を返す" do
      get "/api/shelves/#{shelf.id}/books", params: { tag_id: 0 }

      expect(response).to have_http_status(:ok)
      expect(json["columns"].values.flat_map { it["books"] }).to be_empty
    end

    it "tag_id が数値でなければ400を返す" do
      get "/api/shelves/#{shelf.id}/books", params: { tag_id: "abc" }

      expect(response).to have_http_status(:bad_request)
      expect(json.dig("error", "code")).to eq "bad_request"
    end

    it "本棚がなければ404を返す" do
      get "/api/shelves/0/books"

      expect(response).to have_http_status(:not_found)
      expect(json.dig("error", "message")).to eq "本棚が見つかりません"
    end
  end

  describe "POST /api/shelves/:shelf_id/books（API-06）" do
    it "書籍を登録して201を返す。ステータスを省略すると未読の列の末尾に置く" do
      create(:book, shelf:)

      post "/api/shelves/#{shelf.id}/books", params: {
        book: { title: "三体", author: "劉慈欣", cover_image_url: nil, memo: "", tag_names: [ "小説", "SF" ] }
      }, as: :json

      expect(response).to have_http_status(:created)
      book = Book.last
      expect(json["book"]).to include(
        "id" => book.id, "shelf_id" => shelf.id, "title" => "三体", "author" => "劉慈欣",
        "cover_image_url" => nil, "status" => "unread", "position" => 2, "memo" => nil,
        "started_on" => nil, "finished_on" => nil, "rating" => nil,
        "created_at" => book.created_at.iso8601, "updated_at" => book.updated_at.iso8601
      )
      expect(json.dig("book", "tags").map { it["name"] }).to eq [ "小説", "SF" ]
    end

    it "読了で登録すると、日付・評価をそのまま保存する" do
      post "/api/shelves/#{shelf.id}/books", params: {
        book: { title: "三体", status: "done", started_on: "2026-08-28", finished_on: "2026-09-05", rating: 5 }
      }, as: :json

      expect(json["book"]).to include(
        "status" => "done", "position" => 1, "started_on" => "2026-08-28", "finished_on" => "2026-09-05", "rating" => 5
      )
    end

    it "入力チェックのエラーなら422を返し、登録しない" do
      expect {
        post "/api/shelves/#{shelf.id}/books", params: {
          book: { title: "", rating: 3, tag_names: [ "あ" * 31 ] }
        }, as: :json
      }.not_to change(Book, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq(
        "title" => [ "タイトルを入力してください" ],
        "rating" => [ "評価は読了の書籍のみ入力できます" ],
        "tag_names" => [ "タグ名は30文字以内で入力してください" ]
      )
    end

    it "本棚がなければ404を返す" do
      post "/api/shelves/0/books", params: { book: { title: "三体" } }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/books/:id（API-07）" do
    it "書籍の詳細を返す" do
      book = create(:book, :done, shelf:, memo: "命名の章が良い")
      book.tags << create(:tag, name: "技術書")

      get "/api/books/#{book.id}"

      expect(response).to have_http_status(:ok)
      expect(json["book"]).to include(
        "id" => book.id, "shelf_id" => shelf.id, "status" => "done",
        "started_on" => "2026-09-01", "finished_on" => "2026-09-10", "rating" => 4, "memo" => "命名の章が良い"
      )
      expect(json.dig("book", "tags").map { it["name"] }).to eq [ "技術書" ]
    end

    it "書籍がなければ404を返す" do
      get "/api/books/0"

      expect(response).to have_http_status(:not_found)
      expect(json).to eq("error" => { "code" => "not_found", "message" => "書籍が見つかりません" })
    end
  end

  describe "PATCH /api/books/:id（API-08）" do
    let!(:book) { create(:book, shelf:, title: "三体", memo: "SF").tap { it.tags << create(:tag, name: "小説") } }

    it "送った項目だけを更新する" do
      patch "/api/books/#{book.id}", params: { book: { title: "三体 II" } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json["book"]).to include("title" => "三体 II", "memo" => "SF")
      expect(json.dig("book", "tags").map { it["name"] }).to eq [ "小説" ]
    end

    it "tag_names を送ると、タグをその内容に置き換える。外したタグは、どの書籍にも付いていなければ削除する" do
      patch "/api/books/#{book.id}", params: { book: { tag_names: [ "SF" ] } }, as: :json

      expect(json.dig("book", "tags").map { it["name"] }).to eq [ "SF" ]
      expect(Tag.pluck(:name)).to eq [ "SF" ]
    end

    it "日付・評価は送った値をそのまま保存する" do
      patch "/api/books/#{book.id}", params: {
        book: { status: "done", started_on: "2026-08-01", finished_on: "2026-08-20", rating: 3 }
      }, as: :json

      expect(json["book"]).to include(
        "status" => "done", "started_on" => "2026-08-01", "finished_on" => "2026-08-20", "rating" => 3
      )
    end

    it "本棚を変えると、移動先の列の末尾に置き、移動元の列を詰める" do
      remaining = create(:book, shelf:)
      other = create(:shelf)
      create(:book, shelf: other)

      patch "/api/books/#{book.id}", params: { book: { shelf_id: other.id } }, as: :json

      expect(json["book"]).to include("shelf_id" => other.id, "position" => 2)
      expect(remaining.reload.position).to eq 1
    end

    it "移動先の本棚がなければ422を返す" do
      patch "/api/books/#{book.id}", params: { book: { shelf_id: 0 } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq("shelf_id" => [ "本棚が見つかりません" ])
      expect(book.reload.shelf_id).to eq shelf.id
    end

    it "状態に合わない組み合わせなら422を返す" do
      patch "/api/books/#{book.id}", params: { book: { started_on: "2026-09-01" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq("started_on" => [ "読書開始日は未読の書籍には入力できません" ])
    end

    it "書籍がなければ404を返す" do
      patch "/api/books/0", params: { book: { title: "三体" } }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/books/:id/move（API-09）" do
    let!(:books) { create_list(:book, 2, shelf:) }
    let!(:reading) { create(:book, :reading, shelf:) }

    it "指定した列の位置に移動し、日付を更新した書籍を返す" do
      travel_to(Date.new(2026, 9, 27)) do
        patch "/api/books/#{books[1].id}/move", params: { status: "reading", position: 1 }, as: :json
      end

      expect(response).to have_http_status(:ok)
      expect(json["book"]).to include("status" => "reading", "position" => 1, "started_on" => "2026-09-27")
      expect(reading.reload.position).to eq 2
    end

    it "position を省略すると列の末尾に置く" do
      patch "/api/books/#{books[0].id}/move", params: { status: "reading" }, as: :json

      expect(json["book"]).to include("status" => "reading", "position" => 2)
      expect(books[1].reload.position).to eq 1
    end

    it "status がなければ422を返す" do
      patch "/api/books/#{books[0].id}/move", params: { position: 1 }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq("status" => [ "ステータスを入力してください" ])
    end

    it "position が1未満なら422を返し、移動しない" do
      patch "/api/books/#{books[0].id}/move", params: { status: "reading", position: 0 }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq("position" => [ "並び順は1以上の値にしてください" ])
      expect(books[0].reload.status).to eq "unread"
    end

    it "書籍がなければ404を返す" do
      patch "/api/books/0/move", params: { status: "reading" }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/books/:id（API-10）" do
    it "書籍を削除して204を返し、列を詰める" do
      first, second = create_list(:book, 2, shelf:)
      first.tags << create(:tag)

      expect { delete "/api/books/#{first.id}" }.to change(Book, :count).by(-1).and change(BookTag, :count).by(-1)

      expect(response).to have_http_status(:no_content)
      expect(second.reload.position).to eq 1
    end

    it "書籍がなければ404を返す" do
      delete "/api/books/0"

      expect(response).to have_http_status(:not_found)
    end
  end
end

RSpec.describe "書籍のAPI（同時に操作した場合）", type: :request do
  let(:json) { response.parsed_body }
  let(:shelf) { create(:shelf) }
  let!(:book) { create(:book, shelf:) }

  # 1回目だけ、書籍を読み込むときにデッドロックを起こす
  def deadlock_first(times: 1)
    calls = 0
    allow(Book).to receive(:find).and_wrap_original do |original, *args|
      calls += 1
      raise ActiveRecord::Deadlocked, "Deadlock found" if calls <= times

      original.call(*args)
    end
  end

  it "デッドロックで取り消されたら、最初からやり直す" do
    deadlock_first

    patch "/api/books/#{book.id}/move", params: { status: "reading" }, as: :json

    expect(response).to have_http_status(:ok)
    expect(json.dig("book", "status")).to eq "reading"
    expect(Book).to have_received(:find).twice
  end

  it "3回続けて取り消されたら、500 internal_error を返す" do
    deadlock_first(times: 3)
    allow(Rails.logger).to receive(:error)

    patch "/api/books/#{book.id}/move", params: { status: "reading" }, as: :json

    expect(response).to have_http_status(:internal_server_error)
    expect(json.dig("error", "code")).to eq "internal_error"
    expect(book.reload.status).to eq "unread"
  end

  it "保存している間に移動先の本棚が削除されたら、422 を返す" do
    allow_any_instance_of(Book).to receive(:save).and_raise(ActiveRecord::InvalidForeignKey)

    patch "/api/books/#{book.id}", params: { book: { shelf_id: shelf.id } }, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details")).to eq("shelf_id" => [ "本棚が見つかりません" ])
  end

  it "保存している間に登録先の本棚が削除されたら、404 を返す" do
    allow_any_instance_of(Book).to receive(:save).and_raise(ActiveRecord::InvalidForeignKey)

    post "/api/shelves/#{shelf.id}/books", params: { book: { title: "三体" } }, as: :json

    expect(response).to have_http_status(:not_found)
    expect(json.dig("error", "message")).to eq "本棚が見つかりません"
  end
end
