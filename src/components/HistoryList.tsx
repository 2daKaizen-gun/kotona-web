"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AnalysisHistorySummary, HistoryPage, NuanceResponse } from "@/lib/backend";
import ResultView, { CATEGORY_LABELS, RISK_STYLES } from "./ResultView";

const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

const PAGE_SIZE = 20;

export default function HistoryList() {
  const [items, setItems] = useState<AnalysisHistorySummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 한 페이지를 가져와 뒤에 잇는다. 첫 페이지면 목록을 새로 만든다. */
  const loadPage = useCallback(async (page: number) => {
    const response = await fetch(`/api/history?page=${page}&size=${PAGE_SIZE}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "이력을 불러오지 못했습니다.");
    }

    const result = data as HistoryPage;
    setItems((current) =>
      page === 0 ? (result.content ?? []) : [...(current ?? []), ...(result.content ?? [])],
    );
    setTotal(result.totalElements ?? 0);
    setHasMore(result.hasNext ?? false);
    setNextPage(page + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadPage(0);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "네트워크 오류가 발생했습니다.");
        setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      await loadPage(nextPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "네트워크 오류가 발생했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }

  /** 성공하면 목록에서 빼고 true. 실패하면 목록은 그대로 두고 오류를 보여 준다. */
  async function remove(id: number): Promise<boolean> {
    setError(null);
    try {
      const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "이력을 삭제하지 못했습니다.");
        return false;
      }
      setItems((current) => current?.filter((item) => item.id !== id) ?? null);
      setTotal((current) => Math.max(0, current - 1));
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600
                     dark:text-red-400"
        >
          {error}
        </div>
      )}

      {items === null && !error && <p className="text-sm opacity-50">불러오는 중…</p>}

      {items?.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-black/15 px-6 py-10 text-center text-sm opacity-60 dark:border-white/20">
          아직 분석 이력이 없습니다.{" "}
          <Link href="/" className="underline underline-offset-2">
            첫 문장을 분석해 보세요.
          </Link>
        </p>
      )}

      {items && items.length > 0 && (
        <>
          <p className="text-xs opacity-50">
            전체 {total}건 중 {items.length}건 표시
          </p>

          <ul className="space-y-3">
            {items.map((item) => (
              <HistoryItem key={item.id} item={item} onDelete={remove} />
            ))}
          </ul>

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

function HistoryItem({
  item,
  onDelete,
}: {
  item: AnalysisHistorySummary;
  onDelete: (id: number) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 저장된 분석 결과는 목록에 실려 오지 않는다. 펼칠 때 그 행만 따로 가져온다.
  const [detail, setDetail] = useState<NuanceResponse | null>(null);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "failed">("idle");

  const risk = item.riskLevel ? RISK_STYLES[item.riskLevel] : undefined;

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);

    // 한 번 받아 온 뒤로는 다시 접었다 펴도 재요청하지 않는다.
    if (detail || detailState === "loading" || item.id === undefined) return;

    setDetailState("loading");
    try {
      const response = await fetch(`/api/history/${item.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const parsed = parseResult(data.fullAnalysisJson);
      setDetail(parsed);
      setDetailState(parsed ? "idle" : "failed");
    } catch {
      setDetailState("failed");
    }
  }

  async function handleDelete() {
    if (item.id === undefined) return;
    setDeleting(true);
    // 성공하면 이 항목은 목록에서 사라지므로 상태를 되돌릴 필요가 없다.
    if (!(await onDelete(item.id))) {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li className="rounded-xl border border-black/10 dark:border-white/15">
      <div className="flex items-start gap-4 p-4">
        <button type="button" onClick={toggle} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <p className="line-clamp-2 text-sm leading-relaxed">{item.userInput}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium tabular-nums">{item.totalScore ?? 0}점</span>
            {risk && (
              <span className={`rounded-full border px-2 py-0.5 ${risk.className}`}>리스크 {risk.label}</span>
            )}
            {item.category && <span className="opacity-60">{CATEGORY_LABELS[item.category] ?? item.category}</span>}
            {item.createdAt && (
              <time dateTime={item.createdAt} className="opacity-40">
                {formatDate(item.createdAt)}
              </time>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1 text-xs">
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
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded px-2 py-1 opacity-60 transition hover:opacity-100"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-black/10 p-4 dark:border-white/15">
          {detail ? (
            <ResultView result={detail} />
          ) : detailState === "loading" ? (
            <p className="text-sm opacity-50">분석 결과를 불러오는 중…</p>
          ) : (
            <p className="text-sm opacity-60">저장된 분석 결과를 읽을 수 없습니다.</p>
          )}
        </div>
      )}
    </li>
  );
}

/** 백엔드는 분석 결과 전체를 JSON 문자열로 저장해 둔다. 깨졌으면 요약 줄만 보여 준다. */
function parseResult(json: string | undefined): NuanceResponse | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as NuanceResponse;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}
