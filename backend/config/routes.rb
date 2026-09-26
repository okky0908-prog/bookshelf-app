Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # docs/api.md 2章
  namespace :api do
    resources :shelves, only: %i[index create update destroy] do
      resources :books, only: %i[index create]
    end
    resources :books, only: %i[show update destroy] do
      patch :move, on: :member
    end
    resources :tags, only: %i[index]
    get "stats/monthly_reads", to: "stats#monthly_reads"
  end
  # /api の存在しないURLも、共通の形式の 404 を返す（ほかのルートより後に書く）
  match "api/*path", to: "application#route_not_found", via: :all

  # Defines the root path route ("/")
  # root "posts#index"
end
