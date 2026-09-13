/**
 * 백엔드 없이 배포됐을 때 모든 페이지 맨 위에 붙는 띠.
 *
 * <p>이 배너가 데모 모드를 기만이 아니게 만드는 유일한 장치다. 링크를 연 사람이
 * 1초 안에 "이건 예시구나"를 알아야 한다. 그래서 작은 각주가 아니라 색이 있는 띠이고,
 * 내비게이션보다 위에 있고, 스크롤해도 어느 페이지에서나 같은 자리에 있다.
 * 눈에 덜 띄게 바꾸고 싶어지면, 그 순간 이 기능은 존재 이유를 잃는다.
 */
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
