import AnalyzeForm from "@/components/AnalyzeForm";
import { DEMO_MODE } from "@/lib/demo-mode";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">KOTONA</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-60">
          비즈니스 일본어의 <span className="font-medium opacity-100">本音</span>(속마음)과{" "}
          <span className="font-medium opacity-100">建前</span>(겉마음)을 읽어내고, 정중도 점수와
          상황별 답장을 제안합니다.
        </p>
      </header>

      <AnalyzeForm demo={DEMO_MODE} />
    </main>
  );
}
