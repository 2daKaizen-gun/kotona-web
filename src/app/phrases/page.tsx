import type { Metadata } from "next";
import PhraseDictionary from "@/components/PhraseDictionary";

export const metadata: Metadata = { title: "비즈니스 표현 사전" };

export default function PhrasesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">비즈니스 표현 사전</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-60">
          일본 비즈니스 현장에서 자주 쓰는 표현을 상황별로 모았습니다. 정중도가 높은 순으로 보여 줍니다.
        </p>
      </header>

      <PhraseDictionary />
    </main>
  );
}
