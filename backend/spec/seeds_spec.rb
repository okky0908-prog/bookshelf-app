require "rails_helper"

RSpec.describe "db/seeds.rb" do
  # テスト用DBの作り方によっては初期データが入っていることがあるため、空の状態から始める
  before { Shelf.delete_all }

  def load_seeds
    load Rails.root.join("db/seeds.rb")
  end

  it "本棚が1つもなければ「本棚」を作成する" do
    expect { load_seeds }.to change(Shelf, :count).from(0).to(1)
    expect(Shelf.first.name).to eq "本棚"
  end

  it "何度実行しても本棚は増えない" do
    load_seeds
    expect { load_seeds }.not_to change(Shelf, :count)
  end
end
