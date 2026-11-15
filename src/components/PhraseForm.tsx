"use client";

import { useState } from "react";
import type { BusinessPhrase, PhraseRequest } from "@/lib/backend";
import { MEANING_MAX, PHRASE_MAX, USAGE_EXAMPLE_MAX } from "@/lib/limits";
import { SITUATION_LABELS, SITUATIONS, type Situation } from "@/lib/situations";

const FIELD =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition " +
  "focus:border-black/40 dark:border-white/15 dark:bg-white/5 dark:focus:border-white/40";

/**
 * 표현 등록·수정 폼. PUT 이 전체 교체라 항상 모든 필드를 보낸다.
 * onSubmit 은 실패 시 문구, 성공 시 null 을 돌려준다.
 */
export default function PhraseForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: BusinessPhrase;
  onSubmit: (request: PhraseRequest) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [phrase, setPhrase] = useState(initial?.phrase ?? "");
  const [meaning, setMeaning] = useState(initial?.meaning ?? "");
  const [situation, setSituation] = useState<Situation | "">(initial?.situation ?? "");
  const [politenessLevel, setPolitenessLevel] = useState<number | "">(initial?.politenessLevel ?? 3);
  const [usageExample, setUsageExample] = useState(initial?.usageExample ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = initial !== undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);

    let message: string | null;
    try {
      // 빈 선택은 undefined 로 보내 null 로 저장되게 한다
      message = await onSubmit({
        phrase: phrase.trim(),
        meaning: meaning.trim(),
        situation: situation || undefined,
        politenessLevel: politenessLevel === "" ? undefined : politenessLevel,
        usageExample: usageExample.trim() || undefined,
      });
    } catch {
      // 던지는 경우에도 saving 이 true 로 남지 않게
      message = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }

    if (message) {
      setError(message);
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-black/20 p-5 dark:border-white/25"
    >
      <h2 className="text-sm font-semibold">{editing ? "표현 수정" : "새 표현 추가"}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium">
          표현 (일본어)
          <input
            lang="ja"
            required
            maxLength={PHRASE_MAX}
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            placeholder="例：ご査収ください"
            className={`mt-1.5 ${FIELD}`}
          />
        </label>
        <label className="block text-xs font-medium">
          뜻
          <input
            required
            maxLength={MEANING_MAX}
            value={meaning}
            onChange={(event) => setMeaning(event.target.value)}
            placeholder="예: 확인해 주십시오"
            className={`mt-1.5 ${FIELD}`}
          />
        </label>
        <label className="block text-xs font-medium">
          상황
          <select
            value={situation}
            onChange={(event) => setSituation(event.target.value as Situation | "")}
            className={`mt-1.5 ${FIELD}`}
          >
            <option value="">선택 안 함</option>
            {SITUATIONS.map((value) => (
              <option key={value} value={value}>
                {SITUATION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          정중도
          <select
            value={politenessLevel}
            onChange={(event) => setPolitenessLevel(event.target.value ? Number(event.target.value) : "")}
            className={`mt-1.5 ${FIELD}`}
          >
            <option value="">지정 안 함</option>
            {[5, 4, 3, 2, 1].map((level) => (
              <option key={level} value={level}>
                {level} {level === 5 ? "(가장 정중)" : level === 1 ? "(가장 가벼움)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs font-medium">
        예문
        <textarea
          lang="ja"
          rows={2}
          maxLength={USAGE_EXAMPLE_MAX}
          value={usageExample}
          onChange={(event) => setUsageExample(event.target.value)}
          placeholder="例：資料を添付いたしましたので、ご査収ください。"
          className={`mt-1.5 resize-y ${FIELD}`}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm opacity-60 transition hover:opacity-100"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving || !phrase.trim() || !meaning.trim()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition
                     hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
