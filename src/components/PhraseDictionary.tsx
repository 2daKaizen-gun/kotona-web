"use client";

import { useEffect, useState } from "react";
import type { BusinessPhrase } from "@/lib/backend";
import { SITUATION_LABELS, SITUATIONS, type Situation } from "@/lib/situations";

type Filter = Situation | "ALL";

export default function PhraseDictionary() {
  const [phrases, setPhrases] = useState<BusinessPhrase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/phrases");
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "사전을 불러오지 못했습니다.");
          return;
        }
        setPhrases(data as BusinessPhrase[]);
      } catch {
        if (!cancelled) setError("네트워크 오류가 발생했습니다.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 사전은 수십 건 규모라 한 번 받아 두고 화면에서 거른다.
  // 칩마다 건수를 보여 줄 수 있고, 필터를 바꿀 때 왕복이 없다.
  const visible = phrases?.filter((phrase) => filter === "ALL" || phrase.situation === filter) ?? [];
  const countOf = (situation: Situation) => phrases?.filter((p) => p.situation === situation).length ?? 0;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600
                     dark:text-red-400"
        >
          {error}
        </div>
      )}

      {phrases === null && !error && <p className="text-sm opacity-50">불러오는 중…</p>}

      {phrases && (
        <>
          <div role="group" aria-label="상황별 필터" className="flex flex-wrap gap-2">
            <FilterChip label="전체" count={phrases.length} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
            {SITUATIONS.map((situation) => (
              <FilterChip
                key={situation}
                label={SITUATION_LABELS[situation]}
                count={countOf(situation)}
                active={filter === situation}
                onClick={() => setFilter(situation)}
              />
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 px-6 py-10 text-center text-sm opacity-60 dark:border-white/20">
              이 상황에 등록된 표현이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((phrase) => (
                <PhraseCard key={phrase.id} phrase={phrase} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-black/10 opacity-70 hover:opacity-100 dark:border-white/15"
      }`}
    >
      {label} <span className="tabular-nums opacity-60">{count}</span>
    </button>
  );
}

function PhraseCard({ phrase }: { phrase: BusinessPhrase }) {
  return (
    <li className="rounded-xl border border-black/10 p-5 dark:border-white/15">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p lang="ja" className="text-lg font-medium">
          {phrase.phrase}
        </p>
        <div className="flex items-center gap-3 text-xs">
          {phrase.situation && (
            <span className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
              {SITUATION_LABELS[phrase.situation]}
            </span>
          )}
          {phrase.politenessLevel != null && <PolitenessMeter level={phrase.politenessLevel} />}
        </div>
      </div>
      <p className="mt-1 text-sm opacity-70">{phrase.meaning}</p>
      {phrase.usageExample && (
        <p lang="ja" className="mt-3 rounded-lg bg-black/[0.03] px-4 py-3 text-sm leading-relaxed dark:bg-white/5">
          {phrase.usageExample}
        </p>
      )}
    </li>
  );
}

/** 정중도 1~5 */
function PolitenessMeter({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`정중도 ${level} / 5`} title={`정중도 ${level} / 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${step <= level ? "bg-foreground" : "bg-black/15 dark:bg-white/15"}`}
        />
      ))}
    </span>
  );
}
