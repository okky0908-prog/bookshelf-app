module Api
  class BooksController < ApplicationController
    MAX_ATTEMPTS = 3

    # 本棚・書籍を読み込む前に置き、やり直すときは読み込みからやり直す
    prepend_around_action :retry_on_lock_conflict, only: %i[create update move destroy]
    before_action :set_shelf, only: %i[index create]
    before_action :set_book, only: %i[show update destroy move]

    # API-05 ボード（3列の書籍）。キーワード・タグで絞り込める
    def index
      tag_id = params[:tag_id]
      return render_bad_request if tag_id.present? && !tag_id.to_s.match?(/\A\d+\z/)

      books = @shelf.books.includes(:tags).order(:position)
      books = books.where(id: BookTag.where(tag_id:).select(:book_id)) if tag_id.present?
      books = search(books, params[:q]) if params[:q].present?
      totals = @shelf.books.group(:status).count

      columns = Book.statuses.keys.index_with do |status|
        { total: totals.fetch(status, 0), books: books.select { it.status == status }.map { book_card_json(it) } }
      end
      render json: { shelf_id: @shelf.id, filtered: params[:q].present? || tag_id.present?, columns: }
    end

    # API-06 書籍の登録
    def create
      book = @shelf.books.new(book_params)
      if book.save
        render json: { book: book_json(book) }, status: :created
      else
        render_validation_failed(book)
      end
    end

    # API-07 書籍の詳細
    def show
      render json: { book: book_json(@book) }
    end

    # API-08 書籍の更新
    def update
      if @book.update(book_params(:shelf_id))
        render json: { book: book_json(@book) }
      else
        render_validation_failed(@book)
      end
    end

    # API-09 書籍の列・並び順の変更（ドラッグ&ドロップ）
    def move
      @book.move_to!(status: params[:status], position: params[:position])
      render json: { book: book_json(@book) }
    end

    # API-10 書籍の削除
    def destroy
      @book.destroy!
      head :no_content
    end

    rescue_from ActiveRecord::InvalidForeignKey, with: :render_shelf_gone

    private

    # 並び順の振り直しが同時に行われると、MySQL がデッドロックとして片方を取り消すことがある。
    # 取り消された処理は最初からやり直す（docs/database.md 5章）
    def retry_on_lock_conflict
      attempts = 0
      begin
        attempts += 1
        yield
      rescue ActiveRecord::Deadlocked, ActiveRecord::LockWaitTimeout
        raise if attempts >= MAX_ATTEMPTS

        retry
      end
    end

    # 保存している間に、登録先・移動先の本棚が削除された場合
    def render_shelf_gone
      message = I18n.t("api.errors.record_not_found", model: Shelf.model_name.human)
      if action_name == "create"
        render_error(:not_found, "not_found", message)
      else
        render_error(:unprocessable_content, "validation_failed", details: { shelf_id: [ message ] })
      end
    end

    def set_shelf
      @shelf = Shelf.find(params[:shelf_id])
    end

    def set_book
      @book = Book.find(params[:id])
    end

    def book_params(*extra)
      params.expect(book: [
        *extra, :title, :author, :cover_image_url, :status, :started_on, :finished_on, :rating, :memo, tag_names: []
      ])
    end

    # タイトルまたは著者名に部分一致する書籍に絞り込む（docs/requirements.md 5.8）
    # 英字の大文字・小文字、全角・半角、ひらがな・カタカナは区別せず、濁点・半濁点は区別する照合順序を使う
    # （DBの既定の utf8mb4_0900_ai_ci では「は」と「ば」が一致してしまうため）
    def search(books, keyword)
      pattern = "%#{Book.sanitize_sql_like(keyword.strip)}%"
      books.where(
        "books.title COLLATE utf8mb4_0900_as_ci LIKE :pattern OR books.author COLLATE utf8mb4_0900_as_ci LIKE :pattern",
        pattern:
      )
    end

    def book_card_json(book)
      book.slice(:id, :title, :cover_image_url, :status, :position).merge(tags: tags_json(book))
    end

    def book_json(book)
      book.slice(
        :id, :shelf_id, :title, :author, :cover_image_url, :status, :position,
        :started_on, :finished_on, :rating, :memo
      ).merge(
        tags: tags_json(book),
        created_at: book.created_at.iso8601,
        updated_at: book.updated_at.iso8601
      )
    end

    def tags_json(book)
      book.tags.map { it.slice(:id, :name) }
    end
  end
end
