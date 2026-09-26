module Api
  class ShelvesController < ApplicationController
    before_action :set_shelf, only: %i[update destroy]

    # API-01 本棚の一覧（作成順）
    def index
      shelves = Shelf.with_books_count.order(:id)
      render json: { shelves: shelves.map { shelf_json(it) } }
    end

    # API-02 本棚の作成
    def create
      shelf = Shelf.new(shelf_params)
      if shelf.save
        render json: { shelf: shelf_json(shelf) }, status: :created
      else
        render_validation_failed(shelf)
      end
    end

    # API-03 本棚名の変更
    def update
      if @shelf.update(shelf_params)
        render json: { shelf: shelf_json(@shelf) }
      else
        render_validation_failed(@shelf)
      end
    end

    # API-04 本棚の削除
    # 画面でもボタンを押せなくしているが、APIでも同じ条件を確認する（docs/requirements.md 5.6）
    def destroy
      Shelf.transaction do
        # 確認してから削除するまでの間に、ほかの本棚の削除や、この本棚への書籍の追加が入り込まないようにする
        # 書籍の並び順を変える操作と同じく、ID の昇順でロックする（Book#lock_shelves）
        Shelf.order(:id).lock.ids
        if @shelf.books.exists?
          render_error(:conflict, "shelf_not_empty")
        elsif Shelf.count == 1
          render_error(:conflict, "last_shelf")
        else
          @shelf.destroy!
          head :no_content
        end
      end
    rescue ActiveRecord::RecordNotDestroyed, ActiveRecord::InvalidForeignKey
      # それでも書籍が残っていた場合（外部キーの RESTRICT。docs/database.md 4.2）
      render_error(:conflict, "shelf_not_empty")
    end

    private

    def set_shelf
      @shelf = Shelf.find(params[:id])
    end

    def shelf_params
      params.expect(shelf: [ :name ])
    end

    def shelf_json(shelf)
      { id: shelf.id, name: shelf.name, books_count: shelf.books_count }
    end
  end
end
