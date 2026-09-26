require "rails_helper"

RSpec.describe "APIのエラー（docs/api.md 3.2）", type: :request do
  let(:json) { response.parsed_body }

  it "予期しないエラーは 500 internal_error を返し、詳しい内容はログに残す" do
    allow(Shelf).to receive(:with_books_count).and_raise(RuntimeError, "想定外のエラー")
    allow(Rails.logger).to receive(:error)

    get "/api/shelves"

    expect(response).to have_http_status(:internal_server_error)
    expect(json).to eq(
      "error" => {
        "code" => "internal_error",
        "message" => "サーバーでエラーが発生しました。時間をおいて再度お試しください"
      }
    )
    expect(Rails.logger).to have_received(:error).with(/RuntimeError: 想定外のエラー/)
  end

  it "/api の存在しないURLは 404 not_found を返す" do
    get "/api/unknown"
    expect(response).to have_http_status(:not_found)
    expect(json).to eq("error" => { "code" => "not_found", "message" => "対象が見つかりません" })

    post "/api/shelves/1/unknown"
    expect(response).to have_http_status(:not_found)
    expect(json.dig("error", "code")).to eq "not_found"
  end
end
