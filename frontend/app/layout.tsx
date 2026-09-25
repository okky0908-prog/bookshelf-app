import type { Metadata } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${gothic.variable} ${mincho.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
