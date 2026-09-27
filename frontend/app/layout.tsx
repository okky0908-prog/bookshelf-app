import type { Metadata, Viewport } from "next";
import { Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const gothic = Zen_Kaku_Gothic_New({
  variable: "--font-gothic",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const mincho = Shippori_Mincho_B1({
  variable: "--font-mincho",
  weight: ["600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "本棚アプリ",
  description: "個人の読書記録を管理する本棚アプリ",
};

/**
 * 画面は PC の横幅（1280px 以上）を前提に作っている（docs/screens.md 1章）。
 * スマホでも横幅1280px の画面として描き、ブラウザが画面に収まるよう縮めて表示する（指で広げると拡大できる）
 */
const MIN_WIDTH = 1280;

export const viewport: Viewport = {
  width: MIN_WIDTH,
  // Next.js は既定で initial-scale=1 を付けるが、付いていると縮めずに等倍で表示してしまう（画面の左上しか見えない）ため外す
  initialScale: undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${gothic.variable} ${mincho.variable} h-full antialiased`}>
      <body className="flex min-h-full min-w-[1280px] flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
