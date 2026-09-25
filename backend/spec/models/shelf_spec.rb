require "rails_helper"

RSpec.describe Shelf, type: :model do
  describe "入力チェック" do
    it "本棚名があれば有効" do
      expect(build(:shelf, name: "仕事用")).to be_valid
    end

    it "本棚名の前後の空白を取り除く" do
      expect(build(:shelf, name: "  仕事用  ").name).to eq "仕事用"
    end

    it "本棚名が空白だけなら無効" do
      shelf = build(:shelf, name: "   ")
      expect(shelf).not_to be_valid
      expect(shelf.errors.full_messages).to eq [ "本棚名を入力してください" ]
    end

    it "本棚名は50文字まで" do
      expect(build(:shelf, name: "あ" * 50)).to be_valid

      shelf = build(:shelf, name: "あ" * 51)
      expect(shelf).not_to be_valid
      expect(shelf.errors.full_messages).to eq [ "本棚名は50文字以内で入力してください" ]
    end
  end

  describe "削除" do
    it "書籍がなければ削除できる" do
      shelf = create(:shelf)
      expect(shelf.destroy).to be_truthy
    end

    it "書籍が残っていれば削除できない" do
      shelf = create(:shelf)
      create(:book, shelf:)

      expect(shelf.destroy).to be false
      expect(Shelf.exists?(shelf.id)).to be true
    end

    it "DBの外部キーでも、書籍が残っている本棚は削除できない" do
      shelf = create(:shelf)
      create(:book, shelf:)

      expect { shelf.delete }.to raise_error(ActiveRecord::InvalidForeignKey)
    end
  end
end
