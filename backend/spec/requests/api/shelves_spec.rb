require "rails_helper"

RSpec.describe "本棚のAPI", type: :request do
  let(:json) { response.parsed_body }

  describe "GET /api/shelves（API-01）" do
    it "作成順に、書籍の数と一緒に返す" do
      work = create(:shelf, name: "仕事用")
      hobby = create(:shelf, name: "趣味用")
      create_list(:book, 2, shelf: work)

      get "/api/shelves"

      expect(response).to have_http_status(:ok)
      expect(json).to eq(
        "shelves" => [
          { "id" => work.id, "name" => "仕事用", "books_count" => 2 },
          { "id" => hobby.id, "name" => "趣味用", "books_count" => 0 }
        ]
      )
    end
  end

  describe "POST /api/shelves（API-02）" do
    it "本棚を作成して201を返す" do
      expect {
        post "/api/shelves", params: { shelf: { name: " 漫画 " } }, as: :json
      }.to change(Shelf, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json).to eq("shelf" => { "id" => Shelf.last.id, "name" => "漫画", "books_count" => 0 })
    end

    it "本棚名が未入力なら422を返す" do
      post "/api/shelves", params: { shelf: { name: "" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json).to eq(
        "error" => {
          "code" => "validation_failed",
          "message" => "入力内容に誤りがあります",
          "details" => { "name" => [ "本棚名を入力してください" ] }
        }
      )
    end

    it "本棚名が50文字を超えるなら422を返す" do
      post "/api/shelves", params: { shelf: { name: "あ" * 51 } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq("name" => [ "本棚名は50文字以内で入力してください" ])
    end

    it "本棚の項目が1つも送られていなければ400を返す" do
      post "/api/shelves", params: { shelf: {} }, as: :json

      expect(response).to have_http_status(:bad_request)
      expect(json).to eq("error" => { "code" => "bad_request", "message" => "リクエストの形式が正しくありません" })
    end

    it "JSONの形式が正しくなければ400を返す" do
      post "/api/shelves", params: "{", headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(:bad_request)
      expect(json.dig("error", "code")).to eq "bad_request"
    end
  end

  describe "PATCH /api/shelves/:id（API-03）" do
    let!(:shelf) { create(:shelf, name: "仕事用") }

    it "本棚名を変更して200を返す" do
      create(:book, shelf:)

      patch "/api/shelves/#{shelf.id}", params: { shelf: { name: "技術書" } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(json).to eq("shelf" => { "id" => shelf.id, "name" => "技術書", "books_count" => 1 })
      expect(shelf.reload.name).to eq "技術書"
    end

    it "本棚名が未入力なら422を返し、変更しない" do
      patch "/api/shelves/#{shelf.id}", params: { shelf: { name: " " } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details")).to eq("name" => [ "本棚名を入力してください" ])
      expect(shelf.reload.name).to eq "仕事用"
    end

    it "本棚がなければ404を返す" do
      patch "/api/shelves/0", params: { shelf: { name: "技術書" } }, as: :json

      expect(response).to have_http_status(:not_found)
      expect(json).to eq("error" => { "code" => "not_found", "message" => "本棚が見つかりません" })
    end
  end

  describe "DELETE /api/shelves/:id（API-04）" do
    let!(:shelf) { create(:shelf) }

    context "ほかにも本棚がある場合" do
      before { create(:shelf) }

      it "書籍がなければ削除して204を返す" do
        expect { delete "/api/shelves/#{shelf.id}" }.to change(Shelf, :count).by(-1)

        expect(response).to have_http_status(:no_content)
        expect(response.body).to be_empty
      end

      it "書籍が残っていれば409を返し、削除しない" do
        create(:book, shelf:)

        expect { delete "/api/shelves/#{shelf.id}" }.not_to change(Shelf, :count)

        expect(response).to have_http_status(:conflict)
        expect(json).to eq(
          "error" => {
            "code" => "shelf_not_empty",
            "message" => "書籍が残っているため削除できません。別の本棚へ移動するか削除してください"
          }
        )
      end
    end

    it "最後の1つの本棚なら409を返し、削除しない" do
      expect { delete "/api/shelves/#{shelf.id}" }.not_to change(Shelf, :count)

      expect(response).to have_http_status(:conflict)
      expect(json).to eq(
        "error" => { "code" => "last_shelf", "message" => "本棚が1つしかないため削除できません" }
      )
    end

    it "本棚がなければ404を返す" do
      delete "/api/shelves/0"

      expect(response).to have_http_status(:not_found)
      expect(json.dig("error", "code")).to eq "not_found"
    end
  end
end
