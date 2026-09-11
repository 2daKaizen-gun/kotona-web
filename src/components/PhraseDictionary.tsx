"use client";

import { useEffect, useState } from "react";
import type { BusinessPhrase, PhraseRequest } from "@/lib/backend";
import { SITUATION_LABELS, SITUATIONS, type Situation } from "@/lib/situations";
import PhraseForm from "./PhraseForm";

type Filter = Situation | "ALL";

/** null: 폼 닫힘, "new": 추가 폼, number: 그 id 의 수정 폼 */
type Editing = null | "new" | number;

export default function PhraseDictionary() {
  const [phrases, setPhrases] = useState<BusinessPhrase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editing, setEditing] = useState<Editing>(null);
  // 쓰기가 성공할 때마다 올려서 목록을 다시 받는다. 정렬(정중도 순)을 백엔드에 맡기기 위해서다.
  const [version, setVersion] = useState(0);

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
  }, [version]);

  /** 성공하면 null, 실패하면 폼에 보여 줄 문구(백엔드의 400·409 문구 그대로). */
  async function save(request: PhraseRequest, id?: number): Promise<string | null> {
    try {
      const response = await fetch(id === undefined ? "/api/phrases" : `/api/phrases/${id}`, {
        method: id === undefined ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return data.error ?? "저장하지 못했습니다.";
      }
    } catch {
      return "네트워크 오류가 발생했습니다.";
    }

    // 저장한 표현이 지금 필터에 걸려 보이지 않으면, 저장이 안 된 것처럼 보인다.
    if (filter !== "ALL" && request.situation !== filter) setFilter("ALL");
    setEditing(null);
    setError(null);
    setVersion((current) => current + 1);
    return null;
  }

  async function remove(id: number): Promise<boolean> {
    setError(null);
    try {
      const response = await fetch(`/api/phrases/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "표현을 삭제하지 못했습니다.");
        return false;
      }
      setVersion((current) => current + 1);
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    }
  }

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
          <div className="flex flex-wrap items-start justify-between gap-3">
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
            {editing !== "new" && (
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background
                           transition hover:opacity-90"
              >
                + 표현 추가
              </button>
            )}
          </div>

          {editing === "new" && <PhraseForm onSubmit={(request) => save(request)} onCancel={() => setEditing(null)} />}

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/15 px-6 py-10 text-center text-sm opacity-60 dark:border-white/20">
              이 상황에 등록된 표현이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((phrase) =>
                phrase.id !== undefined && editing === phrase.id ? (
                  <li key={phrase.id}>
                    <PhraseForm
                      initial={phrase}
                      onSubmit={(request) => save(request, phrase.id)}
                      onCancel={() => setEditing(null)}
                    />
                  </li>
                ) : (
                  <PhraseCard
                    key={phrase.id}
                    phrase={phrase}
                    onEdit={() => setEditing(phrase.id ?? null)}
                    onDelete={remove}
                  />
                ),
              )}
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

function PhraseCard({
  phrase,
  onEdit,
  onDelete,
}: {
  phrase: BusinessPhrase;
  onEdit: () => void;
  onDelete: (id: number) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (phrase.id === undefined) return;
    setDeleting(true);
    // 성공하면 목록을 다시 받으면서 이 카드가 사라진다.
    if (!(await onDelete(phrase.id))) {
      setDeleting(false);
      setConfirming(false);
    }
  }

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

      <div className="mt-3 flex justify-end gap-1 text-xs">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded px-2 py-1 font-medium text-red-600 transition hover:bg-red-500/10
                         disabled:opacity-40 dark:text-red-400"
            >
              {deleting ? "삭제 중…" : "삭제 확인"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="rounded px-2 py-1 opacity-60 transition hover:opacity-100"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className="rounded px-2 py-1 opacity-60 transition hover:opacity-100">
              수정
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded px-2 py-1 opacity-60 transition hover:opacity-100"
            >
              삭제
            </button>
          </>
        )}
      </div>
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
