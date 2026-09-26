class ApplicationController < ActionController::API
  # エラーは共通の形式で返す（docs/api.md 3.2）
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActionController::ParameterMissing, ActionDispatch::Http::Parameters::ParseError,
              with: :render_bad_request

  private

  def render_error(status, code, message = I18n.t("api.errors.#{code}"), details: nil)
    error = { code:, message: }
    error[:details] = details if details
    render json: { error: }, status:
  end

  # details のキーは項目名、値は「項目名＋メッセージ」の配列にする
  def render_validation_failed(record)
    render_error(:unprocessable_content, "validation_failed", details: record.errors.to_hash(true))
  end

  def render_not_found(exception)
    # 例：「本棚が見つかりません」
    model = exception.model&.safe_constantize
    message = model ? I18n.t("api.errors.record_not_found", model: model.model_name.human) : I18n.t("api.errors.not_found")
    render_error(:not_found, "not_found", message)
  end

  def render_bad_request
    render_error(:bad_request, "bad_request")
  end
end
