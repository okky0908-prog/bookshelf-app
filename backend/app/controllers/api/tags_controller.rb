module Api
  class TagsController < ApplicationController
    # API-11 タグの一覧（名前の順）
    # どの書籍にも付いていないタグは出さない（タグの削除機能がないため、外したタグが選択肢に残らないようにする）
    def index
      tags = Tag.where(id: BookTag.select(:tag_id)).order(:normalized_name)
      keyword = Tag.normalize_name(params[:q].to_s)
      tags = tags.where("normalized_name LIKE ?", "%#{Tag.sanitize_sql_like(keyword)}%") if keyword.present?

      render json: { tags: tags.map { it.slice(:id, :name) } }
    end
  end
end
