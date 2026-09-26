require "rails_helper"

RSpec.describe "タグのAPI", type: :request do
  let(:json) { response.parsed_body }

  describe "GET /api/tags（API-11）" do
    let(:book) { create(:book) }
    let!(:mystery) { create(:tag, name: "ミステリー").tap { book.tags << it } }
    let!(:mystery_novel) { create(:tag, name: "ミステリー小説").tap { book.tags << it } }
    let!(:ruby) { create(:tag, name: "Ruby").tap { book.tags << it } }

    it "書籍に付いているタグを、名前の順（normalized_name の順）に返す" do
      create(:tag, name: "どの書籍にも付いていないタグ")

      get "/api/tags"

      expect(response).to have_http_status(:ok)
      expect(json).to eq(
        "tags" => [
          { "id" => ruby.id, "name" => "Ruby" },
          { "id" => mystery.id, "name" => "ミステリー" },
          { "id" => mystery_novel.id, "name" => "ミステリー小説" }
        ]
      )
    end

    it "q を正規化して、部分一致するタグに絞り込む" do
      get "/api/tags", params: { q: "ﾐｽﾃﾘ" }

      expect(json["tags"].map { it["name"] }).to eq [ "ミステリー", "ミステリー小説" ]
    end

    it "q の英字の大文字・小文字、全角・半角を区別しない" do
      get "/api/tags", params: { q: "ＲＵ" }

      expect(json["tags"].map { it["name"] }).to eq [ "Ruby" ]
    end

    it "q が空白だけなら、すべてのタグを返す" do
      get "/api/tags", params: { q: "  " }

      expect(json["tags"].size).to eq 3
    end

    it "q の % や _ は、そのままの文字として探す" do
      get "/api/tags", params: { q: "%" }

      expect(json["tags"]).to eq []
    end
  end
end
