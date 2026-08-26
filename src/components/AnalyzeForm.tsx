"use client";

import { useState } from "react";
import type { NuanceResponse, RelationshipType } from "@/lib/backend";
import ResultView from "./ResultView";
import ProgressIndicator from "./ProgressIndicator";

const RELATIONSHIPS: { value: RelationshipType; label: string; hint: string }[] = [
  { value: "INTERNAL", label: "사내", hint: "동료·상사와의 일상 업무 소통" },
  { value: "EXTERNAL", label: "사외 / 고객사", hint: "리스크 판정이 1.2배 엄격해집니다" },
  { value: "INTERVIEW", label: "면접", hint: "리스크 판정이 1.5배 엄격해집니다" },
];

const SAMPLES = [
  "ご提案の件、社内で検討させていただきます。",
  "お手数ですが、ご確認いただけますでしょうか。",
  "よろしく",
];

export default function AnalyzeForm() {
  const [text, setText] = useState("");
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("INTERNAL");
  const [result, setResult] = useState<NuanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, relationshipType }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "분석에 실패했습니다.");
        return;
      }
      setResult(data as NuanceResponse);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="text" className="mb-2 block text-sm font-medium">
            분석할 일본어 문장
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            placeholder="例：ご提案の件、社内で検討させていただきます。"
            className="w-full resize-y rounded-lg border border-black/15 bg-white px-4 py-3 text-base
                       outline-none transition focus:border-black/40
                       dark:border-white/15 dark:bg-white/5 dark:focus:border-white/40"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs opacity-60">예시:</span>
            {SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setText(sample)}
                className="rounded-full border border-black/10 px-3 py-1 text-xs opacity-70
                           transition hover:opacity-100 dark:border-white/15"
              >
                {sample.length > 20 ? `${sample.slice(0, 20)}…` : sample}
              </button>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">상대와의 관계</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {RELATIONSHIPS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border px-4 py-3 transition ${
                  relationshipType === option.value
                    ? "border-black/60 bg-black/[0.03] dark:border-white/60 dark:bg-white/10"
                    : "border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/30"
                }`}
              >
                <input
                  type="radio"
                  name="relationshipType"
                  value={option.value}
                  checked={relationshipType === option.value}
                  onChange={() => setRelationshipType(option.value)}
                  className="sr-only"
                />
                <div className="text-sm font-medium">{option.label}</div>
                <div className="mt-0.5 text-xs opacity-60">{option.hint}</div>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full rounded-lg bg-foreground px-6 py-3 font-medium text-background
                     transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "분석 중…" : "분석하기"}
        </button>
      </form>

      {loading && <ProgressIndicator />}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600
                     dark:text-red-400"
        >
          {error}
        </div>
      )}

      {result && <ResultView result={result} />}
    </div>
  );
}
