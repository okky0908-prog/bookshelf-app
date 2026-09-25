# 本棚（docs/database.md 3.1）
class CreateShelves < ActiveRecord::Migration[8.1]
  def change
    create_table :shelves do |t|
      t.string :name, limit: 50, null: false

      t.timestamps
    end
  end
end
