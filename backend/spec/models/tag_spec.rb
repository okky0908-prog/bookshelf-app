require "rails_helper"

RSpec.describe Tag, type: :model do
  describe ".normalize_name（docs/database.md 3.3.1）" do
    {
      " SF  小説 " => "sf 小説",
      "　全角　空白　" => "全角 空白",
      "Ruby" => "ruby",
      "ＲＵＢＹ" => "ruby",
      "ミステリー" => "みすてりー",
      "ﾐｽﾃﾘｰ" => "みすてりー",
      "みすてりー" => "みすてりー",
      "㍻" => "平成",
      "小説" => "小説"
    }.each do |input, expected|
      it "#{input.inspect} は #{expected.inspect} になる" do
        expect(Tag.normalize_name(input)).to eq expected
      end
    end
  end

  describe "入力チェック" do
    it "保存時に normalized_name を入れる" do
      expect(create(:tag, name: "ミステリー").normalized_name).to eq "みすてりー"
    end

    it "タグ名は、最初に入力した表記のまま（前後の空白は取り除いて）保存する" do
      expect(create(:tag, name: " Ruby on Rails ").name).to eq "Ruby on Rails"
    end

    it "タグ名が空白だけなら無効" do
      tag = build(:tag, name: "  ")
      expect(tag).not_to be_valid
      expect(tag.errors.full_messages).to include "タグ名を入力してください"
    end

    it "タグ名は30文字まで" do
      expect(build(:tag, name: "あ" * 30)).to be_valid

      tag = build(:tag, name: "あ" * 31)
      expect(tag).not_to be_valid
      expect(tag.errors.full_messages).to eq [ "タグ名は30文字以内で入力してください" ]
    end

    it "表記ゆれを含めて、同じタグは作れない" do
      create(:tag, name: "Ruby")

      tag = build(:tag, name: "ＲＵＢＹ")
      expect(tag).not_to be_valid
      expect(tag.errors.full_messages).to eq [ "タグ名はすでに存在します" ]
    end

    it "部分一致するだけのタグは別のタグとして作れる" do
      create(:tag, name: "SF")
      expect(build(:tag, name: "SF漫画")).to be_valid
    end

    it "DBの一意制約でも、同じ normalized_name のタグは作れない" do
      create(:tag, name: "Ruby")
      duplicate = Tag.new(name: "ruby", normalized_name: "ruby")
      expect { duplicate.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end
end
