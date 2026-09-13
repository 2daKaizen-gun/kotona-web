"use client";

import { useState } from "react";
import type { NuanceResponse } from "@/lib/backend";

export const RISK_STYLES: Record<string, { label: string; className: string }> = {
  SAFE: { label: "안전", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  CAUTION: { label: "주의", className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  DANGER: { label: "위험", className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400" },
};

export const CATEGORY_LABELS: Record<string, string> = {
  EMAIL: "비즈니스 메일",
  INTERVIEW: "면접",
  MEETING: "회의",
  INTERNAL_CHAT: "사내 채팅",
  CASUAL: "일상 대화",
};

/** 백엔드의 배점: 정중도 40 / 간접성 30 / 에티켓 30 */
const METRIC_MAX = { politeness: 40, indirectness: 30, etiquette: 30 } as const;

export default function ResultView({
  result,
  sample = false,
}: {
  result: NuanceResponse;
  /** 예시 데이터인지. 결과 카드만 잘려 공유돼도 알아볼 수 있도록 여기에도 표시한다. */
  sample?: boolean;
}) {
  const risk = RISK_STYLES[result.riskAnalysis?.riskLevel ?? "SAFE"] ?? RISK_STYLES.SAFE;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-semibold tabular-nums">{result.totalScore ?? 0}</span>
            <span className="text-lg opacity-40">/ 100</span>
          </div>
          <div className="flex items-center gap-2">
            {sample && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1
                               text-xs font-medium text-amber-800 dark:text-amber-200">
                샘플
              </span>
            )}
            {result.category && (
              <span className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15">
                {CATEGORY_LABELS[result.category] ?? result.category}
              </span>
            )}
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${risk.className}`}>
              리스크 {risk.label}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <MetricBar label="정중도 (敬語)" value={result.metrics?.politeness ?? 0} max={METRIC_MAX.politeness} />
          <MetricBar label="간접성 (曖昧語)" value={result.metrics?.indirectness ?? 0} max={METRIC_MAX.indirectness} />
          <MetricBar label="에티켓 (쿠션어)" value={result.metrics?.etiquette ?? 0} max={METRIC_MAX.etiquette} />
        </div>

        {result.evaluation?.summary && (
          <p className="mt-6 border-t border-black/10 pt-4 text-sm leading-relaxed dark:border-white/15">
            {result.evaluation.summary}
          </p>
        )}
      </section>

      {result.sentiment?.honne && (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="mb-4 text-sm font-semibold">本音 / 建前</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <HonneCard label="建前 — 표면적 의미" body={result.sentiment.honne.tatemae} muted />
            <HonneCard label="本音 — 숨겨진 의도" body={result.sentiment.honne.trueIntent} />
          </div>
          {result.sentiment.honne.actionItem && (
            <p className="mt-4 rounded-lg bg-black/[0.03] px-4 py-3 text-sm dark:bg-white/5">
              <span className="font-medium">권장 행동 </span>
              {result.sentiment.honne.actionItem}
            </p>
          )}
        </section>
      )}

      {(result.riskAnalysis?.redFlags?.length || result.riskAnalysis?.copingStrategy) && (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="mb-4 text-sm font-semibold">리스크 분석</h2>
          {result.riskAnalysis.redFlags && result.riskAnalysis.redFlags.length > 0 && (
            <ul className="mb-4 space-y-1.5">
              {result.riskAnalysis.redFlags.map((flag) => (
                <li key={flag} className="flex gap-2 text-sm">
                  <span aria-hidden className="opacity-40">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          )}
          {result.riskAnalysis.copingStrategy && (
            <p className="text-sm leading-relaxed opacity-80">{result.riskAnalysis.copingStrategy}</p>
          )}
        </section>
      )}

      {result.smartReplies && result.smartReplies.length > 0 && (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="mb-4 text-sm font-semibold">추천 답장</h2>
          <div className="space-y-4">
            {result.smartReplies.map((reply, index) => (
              <SmartReplyCard key={`${reply.scenario}-${index}`} reply={reply} />
            ))}
          </div>
        </section>
      )}

      {result.suggestions && result.suggestions.length > 0 && (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="mb-4 text-sm font-semibold">개선된 표현</h2>
          <ul className="space-y-3">
            {result.suggestions.map((suggestion, index) => (
              <li key={`${suggestion.text}-${index}`} className="flex flex-wrap items-baseline gap-2">
                <span className="rounded border border-black/10 px-1.5 py-0.5 text-[10px] uppercase opacity-60 dark:border-white/15">
                  {suggestion.level}
                </span>
                <span className="text-sm">{suggestion.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.feedback && (result.feedback.issues?.length || result.feedback.cultural_nuance) && (
        <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
          <h2 className="mb-4 text-sm font-semibold">피드백</h2>
          {result.feedback.issues && result.feedback.issues.length > 0 && (
            <ul className="mb-4 space-y-1.5">
              {result.feedback.issues.map((issue) => (
                <li key={issue} className="flex gap-2 text-sm">
                  <span aria-hidden className="opacity-40">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
          {result.feedback.cultural_nuance && (
            <p className="text-sm leading-relaxed opacity-80">{result.feedback.cultural_nuance}</p>
          )}
        </section>
      )}
    </div>
  );
}

function MetricBar({ label, value, max }: { label: string; value: number; max: number }) {
  const ratio = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="opacity-70">{label}</span>
        <span className="tabular-nums opacity-50">
          {value} / {max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

function HonneCard({ label, body, muted }: { label: string; body?: string; muted?: boolean }) {
  return (
    <div className={`rounded-lg border border-black/10 p-4 dark:border-white/15 ${muted ? "opacity-60" : ""}`}>
      <div className="mb-2 text-xs font-medium opacity-60">{label}</div>
      <p className="text-sm leading-relaxed">{body ?? "—"}</p>
    </div>
  );
}

function SmartReplyCard({ reply }: { reply: NonNullable<NuanceResponse["smartReplies"]>[number] }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!reply.content) return;
    try {
      await navigator.clipboard.writeText(reply.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 조용히 넘어간다. 텍스트는 화면에 그대로 보인다.
    }
  }

  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium">{reply.scenario}</span>
        {reply.nuanceLevel && (
          <span className="rounded border border-black/10 px-1.5 py-0.5 text-[10px] opacity-60 dark:border-white/15">
            {reply.nuanceLevel}
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded px-2 py-1 text-xs opacity-60 transition hover:opacity-100"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="text-sm leading-relaxed">{reply.content}</p>
      {reply.description && <p className="mt-2 text-xs leading-relaxed opacity-60">{reply.description}</p>}
    </div>
  );
}
