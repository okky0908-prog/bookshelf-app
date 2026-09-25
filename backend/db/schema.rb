# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_26_090004) do
  create_table "book_tags", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "book_id", null: false
    t.bigint "tag_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["book_id", "tag_id"], name: "index_book_tags_on_book_id_and_tag_id", unique: true
    t.index ["tag_id"], name: "index_book_tags_on_tag_id"
  end

  create_table "books", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "shelf_id", null: false
    t.string "title", null: false
    t.string "author"
    t.string "cover_image_url", limit: 2048
    t.string "status", limit: 10, default: "unread", null: false
    t.integer "position", null: false
    t.date "started_on"
    t.date "finished_on"
    t.integer "rating", limit: 1
    t.text "memo"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["shelf_id", "status", "position"], name: "index_books_on_shelf_id_and_status_and_position"
    t.index ["status", "finished_on"], name: "index_books_on_status_and_finished_on"
    t.check_constraint "(`rating` is null) or (`rating` between 1 and 5)", name: "chk_books_rating"
    t.check_constraint "(`status` <> _utf8mb4'unread') or (`started_on` is null)", name: "chk_books_unread_no_start"
    t.check_constraint "(`status` = _utf8mb4'done') or ((`finished_on` is null) and (`rating` is null))", name: "chk_books_done_only"
    t.check_constraint "`status` in (_utf8mb4'unread',_utf8mb4'reading',_utf8mb4'done')", name: "chk_books_status"
  end

  create_table "shelves", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", limit: 50, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "tags", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", limit: 30, null: false
    t.string "normalized_name", limit: 100, null: false, collation: "utf8mb4_bin"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["normalized_name"], name: "index_tags_on_normalized_name", unique: true
  end

  add_foreign_key "book_tags", "books", on_delete: :cascade
  add_foreign_key "book_tags", "tags", on_delete: :cascade
  add_foreign_key "books", "shelves"
end
