/** 데모 모드일 때 모든 페이지 맨 위에 붙는 띠. 예시 데이터라는 걸 바로 알 수 있게 눈에 띄게 둔다. */
export default function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-amber-900
                 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="font-semibold">예시 모드</span>
        <span className="opacity-80">
          지금 보이는 점수·본음·답장은 미리 준비된 <strong className="font-medium">샘플</strong>입니다.
          실제 AI 분석이 아니며, 입력한 문장은 어디에도 저장되지 않습니다.
        </span>
        <a
          href="https://github.com/2daKaizen-gun/kotona-analyzer"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 opacity-80 transition hover:opacity-100"
        >
          왜인가요?
        </a>
      </div>
    </div>
  );
}
