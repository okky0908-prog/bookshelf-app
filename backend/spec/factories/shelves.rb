FactoryBot.define do
  factory :shelf do
    sequence(:name) { |n| "本棚#{n}" }
  end
end
