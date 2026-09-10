"use client";

import { useEffect, useState } from "react";

/**
 * 분석은 보통 25초 안팎이지만 꼬리가 길다(관측 최대 79초). 스피너만 돌리면
 * 멈춘 것처럼 보이므로 백엔드가 실제로 거치는 단계를 시간에 맞춰 보여 준다.
 *
 * 서버가 진행 상황을 스트리밍하지는 않으므로 이 타이밍은 실측에 기반한 추정이다.
 * 마지막 단계는 응답이 올 때까지 유지된다 — 오래 걸리는 요청이 여기 머문다.
 */
const STAGES = [
  { at: 0, label: "문장 정규화 및 형태소 분석" },
  { at: 2, label: "AI가 경어·간접표현을 평가하는 중" },
  { at: 10, label: "本音(속마음)과 리스크를 추출하는 중" },
  { at: 18, label: "상황별 추천 답장을 작성하는 중" },
];

export default function ProgressIndicator() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const currentIndex = STAGES.reduce(
    (latest, stage, index) => (elapsed >= stage.at ? index : latest),
    0,
  );

  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-5 dark:border-white/15 dark:bg-white/5">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-sm font-medium">분석 중</span>
        <span className="font-mono text-xs opacity-50">{elapsed}초</span>
      </div>

      <ol className="space-y-2.5">
        {STAGES.map((stage, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={stage.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  done
                    ? "bg-foreground text-background"
                    : active
                      ? "animate-pulse bg-foreground/30"
                      : "bg-black/10 dark:bg-white/10"
                }`}
              >
                {done ? "✓" : ""}
              </span>
              <span className={done || active ? "" : "opacity-40"}>{stage.label}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs opacity-50">
        보통 25초 안팎, 길면 1분 넘게 걸립니다. 답장 3종을 일본어로 생성하느라 시간이 소요됩니다.
      </p>
    </div>
  );
}
