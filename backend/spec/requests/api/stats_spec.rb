require "rails_helper"

RSpec.describe "集計のAPI", type: :request do
  let(:json) { response.parsed_body }

  describe "GET /api/stats/monthly_reads（API-12）" do
    def create_done(finished_on, **attributes)
      create(:book, :done, started_on: nil, finished_on:, **attributes)
    end

    before do
      create_done(Date.new(2025, 10, 1))
      create_done(Date.new(2026, 9, 1))
      create_done(Date.new(2026, 9, 30), shelf: create(:shelf))
      create_done(Date.new(2026, 10, 1))
      create_done(nil)
      create(:book, :reading)
    end

    it "全本棚の合計で、月ごとの読了冊数を古い月から順に返す（0冊の月も含める）" do
      get "/api/stats/monthly_reads", params: { from: "2025-10", to: "2026-09" }

      expect(response).to have_http_status(:ok)
      months = json["months"]
      expect(months.size).to eq 12
      expect(months.first).to eq("month" => "2025-10", "count" => 1)
      expect(months[1]).to eq("month" => "2025-11", "count" => 0)
      expect(months.last).to eq("month" => "2026-09", "count" => 2)
    end

    it "from と to が同じなら、その月だけを返す" do
      get "/api/stats/monthly_reads", params: { from: "2026-09", to: "2026-09" }

      expect(json).to eq("months" => [ { "month" => "2026-09", "count" => 2 } ])
    end

    it "年をまたぐ期間でも数える" do
      get "/api/stats/monthly_reads", params: { from: "2025-12", to: "2026-01" }

      expect(json["months"].map { it["month"] }).to eq [ "2025-12", "2026-01" ]
    end

    it "24ヶ月までは指定できる" do
      get "/api/stats/monthly_reads", params: { from: "2024-10", to: "2026-09" }

      expect(response).to have_http_status(:ok)
      expect(json["months"].size).to eq 24
    end

    [
      [ "from がない", { to: "2026-09" } ],
      [ "to がない", { from: "2026-09" } ],
      [ "月が13", { from: "2026-13", to: "2026-13" } ],
      [ "形式が YYYY-MM でない", { from: "2026-9", to: "2026-09" } ],
      [ "from が to より後", { from: "2026-10", to: "2026-09" } ],
      [ "期間が24ヶ月を超える", { from: "2024-09", to: "2026-09" } ]
    ].each do |description, params|
      it "#{description}なら400を返す" do
        get "/api/stats/monthly_reads", params: params

        expect(response).to have_http_status(:bad_request)
        expect(json.dig("error", "code")).to eq "bad_request"
      end
    end
  end
end
