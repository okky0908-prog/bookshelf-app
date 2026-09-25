require "rails_helper"

RSpec.describe BookTag, type: :model do
  it "同じ書籍に同じタグを二重に付けられない" do
    book = create(:book)
    tag = create(:tag)
    BookTag.create!(book:, tag:)

    expect(BookTag.new(book:, tag:)).not_to be_valid
    expect { BookTag.new(book:, tag:).save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
