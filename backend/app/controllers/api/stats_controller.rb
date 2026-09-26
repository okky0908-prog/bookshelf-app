module Api
  class StatsController < ApplicationController
    MAX_MONTHS = 24

    # API-12 月別の読了冊数（全本棚の合計。0冊の月も含め、古い月から順に返す）
    def monthly_reads
      from = parse_month(params[:from])
      to = parse_month(params[:to])
      return render_bad_request unless from && to && from <= to && months_between(from, to) <= MAX_MONTHS

      counts = Book.done.where(finished_on: from..to.end_of_month)
                   .group("DATE_FORMAT(finished_on, '%Y-%m')").count
      months = (0...months_between(from, to)).map do |offset|
        month = from.advance(months: offset).strftime("%Y-%m")
        { month:, count: counts.fetch(month, 0) }
      end
      render json: { months: }
    end

    private

    # "YYYY-MM" をその月の1日にする。形式が正しくなければ nil
    def parse_month(value)
      return unless value.is_a?(String) && value.match?(/\A\d{4}-(0[1-9]|1[0-2])\z/)

      Date.strptime(value, "%Y-%m")
    end

    # from と to を含む月の数
    def months_between(from, to)
      (to.year - from.year) * 12 + (to.month - from.month) + 1
    end
  end
end
