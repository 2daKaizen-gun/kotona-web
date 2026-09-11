import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "KOTONA", template: "%s · KOTONA" },
  description: "비즈니스 일본어의 本音과 建前을 읽어내고, 정중도 점수와 상황별 답장을 제안합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteNav />
        {children}
        <footer className="mx-auto mt-auto w-full max-w-3xl px-6 pb-10">
          <div className="border-t border-black/10 pt-6 text-xs opacity-40 dark:border-white/15">
            분석 엔진:{" "}
            <a
              href="https://github.com/2daKaizen-gun/kotona-analyzer"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              kotona-analyzer
            </a>{" "}
            (Spring Boot + Gemini)
          </div>
        </footer>
      </body>
    </html>
  );
}
