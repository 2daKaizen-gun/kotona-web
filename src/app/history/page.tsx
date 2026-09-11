import type { Metadata } from "next";
import HistoryList from "@/components/HistoryList";

export const metadata: Metadata = { title: "분석 이력" };

export default function HistoryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">분석 이력</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-60">
          지금까지 분석한 문장입니다. 항목을 펼치면 당시의 분석 결과를 다시 볼 수 있습니다.
        </p>
      </header>

      <HistoryList />
    </main>
  );
}
