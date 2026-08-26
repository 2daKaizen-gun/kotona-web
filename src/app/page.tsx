import AnalyzeForm from "@/components/AnalyzeForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">KOTONA</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-60">
          비즈니스 일본어의 <span className="font-medium opacity-100">本音</span>(속마음)과{" "}
          <span className="font-medium opacity-100">建前</span>(겉마음)을 읽어내고, 정중도 점수와
          상황별 답장을 제안합니다.
        </p>
      </header>

      <AnalyzeForm />

      <footer className="mt-16 border-t border-black/10 pt-6 text-xs opacity-40 dark:border-white/15">
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
      </footer>
    </main>
  );
}
