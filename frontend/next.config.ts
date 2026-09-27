import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本番（AWS）では、フロントエンドのサーバーの nginx が静的ファイルを返すため、`next build` で out/ に書き出す（docs/infrastructure.md）
  // 画面はすべてブラウザ側で動くため、Next.js のサーバーはいらない
  output: "export",
};

export default nextConfig;
