"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusinessPhrase, PhraseCursor, PhrasePage, PhraseRequest } from "@/lib/backend";
import { appendUnique } from "@/lib/append-unique";
import { errorMessage, readJson } from "@/lib/read-json";
import { SITUATION_LABELS, SITUATIONS, type Situation } from "@/lib/situations";
import PhraseForm from "./PhraseForm";

type Filter = Situation | "ALL";

const PAGE_SIZE = 20;

/** null: 폼 닫힘, "new": 추가 폼, number: 그 id 의 수정 폼 */
type Editing = null | "new" | number;

export default function PhraseDictionary() {
  const [phrases, setPhrases] = useState<BusinessPhrase[] | null>(null);
  const [total, setTotal] = useState(0);
  // 마지막으로 받은 행의 (id, 정중도). "더 보기" 는 이 다음부터 받는다.
  const [cursor, setCursor] = useState<PhraseCursor | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editing, setEditing] = useState<Editing>(null);
  // 쓰기가 성공하면 올려서 목록을 다시 받는다 (정렬은 백엔드가 한다)
  const [version, setVersion] = useState(0);

  // 마지막 요청 번호. 필터를 빨리 바꾸면 늦게 온 이전 응답을 버린다.
  const latestRequest = useRef(0);

  /** 커서가 없으면 새로 만들고, 있으면 이어 붙인다. */
  const loadPage = useCallback(async (situation: Filter, after?: PhraseCursor) => {
    const request = ++latestRequest.current;
    const query = new URLSearchParams({ size: String(PAGE_SIZE) });
    if (situation !== "ALL") query.set("situation", situation);
    if (after) {
      query.set("afterId", String(after.afterId));
      if (after.afterLevel !== undefined) query.set("afterLevel", String(after.afterLevel));
    }

    const response = await fetch(`/api/phrases?${query}`);
    const data = await readJson(response);
    if (request !== latestRequest.current) return;
    if (!response.ok || data === null) {
      throw new Error(errorMessage(data, response.status, "사전을 불러오지 못했습니다."));
    }

    const result = data as PhrasePage;
    const rows = result.content ?? [];
    setPhrases((current) => (after ? appendUnique(current ?? [], rows) : rows));
    // 커서 뒤 응답의 건수는 남은 건수다
    if (!after) setTotal(result.totalElements ?? 0);
    setHasMore(result.hasNext ?? false);
    const last = rows.at(-1);
    if (last?.id !== undefined) {
      setCursor({ afterId: last.id, afterLevel: last.politenessLevel ?? undefined });
    }
  }, []);

  // 필터가 바뀌면 서버에 다시 요청한다.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadPage(filter);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "네트워크 오류가 발생했습니다.");
        setPhrases([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, version, loadPage]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      await loadPage(filter, cursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "네트워크 오류가 발생했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }

  /** 성공하면 null, 실패하면 폼에 보여 줄 문구. */
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

    // 저장한 표현이 현재 필터에 안 보이면 필터를 해제한다
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

  const visible = phrases ?? [];

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
              <FilterChip label="전체" active={filter === "ALL"} onClick={() => setFilter("ALL")} />
              {SITUATIONS.map((situation) => (
                <FilterChip
                  key={situation}
                  label={SITUATION_LABELS[situation]}
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

          {visible.length > 0 && (
            <p className="text-xs opacity-50">
              {filter === "ALL" ? "전체" : SITUATION_LABELS[filter]} {total}건 중 {visible.length}건 표시
            </p>
          )}

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

          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-lg border border-black/10 px-4 py-3 text-sm transition
                         hover:bg-black/[0.03] disabled:opacity-40
                         dark:border-white/15 dark:hover:bg-white/5"
            >
              {loadingMore ? "불러오는 중…" : "더 보기"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// 한 페이지만 받으므로 상황별 건수는 표시하지 않는다.
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
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
      {label}
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
