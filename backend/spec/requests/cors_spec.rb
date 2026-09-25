require "rails_helper"

RSpec.describe "CORS", type: :request do
  it "フロントエンド（localhost:3000）からの /api へのプリフライトを許可する" do
    options "/api/shelves", headers: {
      "Origin" => "http://localhost:3000",
      "Access-Control-Request-Method" => "GET"
    }
    expect(response.headers["Access-Control-Allow-Origin"]).to eq("http://localhost:3000")
  end
end
