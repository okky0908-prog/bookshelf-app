FactoryBot.define do
  factory :book do
    shelf
    sequence(:title) { |n| "書籍#{n}" }

    trait :reading do
      status { "reading" }
      started_on { Date.new(2026, 9, 1) }
    end

    trait :done do
      status { "done" }
      started_on { Date.new(2026, 9, 1) }
      finished_on { Date.new(2026, 9, 10) }
      rating { 4 }
    end
  end
end
