import type { components } from "@/types/api";

export type NuanceResponse = components["schemas"]["NuanceResponseDTO"];
export type AnalyzeRequest = components["schemas"]["AnalyzeRequestDTO"];
export type BusinessPhrase = components["schemas"]["BusinessPhrase"];
export type AnalysisHistory = components["schemas"]["AnalysisHistory"];

export type RelationshipType = "INTERNAL" | "EXTERNAL" | "INTERVIEW";
export type RiskLevel = "SAFE" | "CAUTION" | "DANGER";

/**
 * 백엔드(Spring) 호출을 한 곳에 모은다.
 *
 * 이 모듈은 서버에서만 실행된다. KOTONA_API_KEY 는 NEXT_PUBLIC_ 접두사가 없으므로
 * 클라이언트 번들에 포함되지 않는다 — 브라우저가 백엔드를 직접 부르지 않고
 * route handler 를 거치는 이유가 이것이다.
 */
const BASE_URL = process.env.KOTONA_API_URL ?? "http://localhost:8081";
const API_KEY = process.env.KOTONA_API_KEY;

/** 백엔드가 4xx/5xx 를 돌려줬을 때. status 를 그대로 전달해 route handler 가 매핑한다. */
export class BackendError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  /** 분석은 25초 이상 걸린다. 기본 타임아웃으로는 부족하다. */
  timeoutMs?: number;
};

async function callBackend<T>(path: string, options: FetchOptions = {}): Promise<T> {
  // 분석은 꼬리가 길다(관측 최대 79초). route handler 의 maxDuration(120초) 안에 머무르되
  // 그보다 먼저 끊어, 프레임워크가 자르기 전에 우리 문구로 안내한다.
  const { method = "GET", body, timeoutMs = 110_000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        // 키가 설정된 경우에만 붙인다. 로컬 백엔드는 API_KEY 미설정이라 없어도 통과한다.
        ...(API_KEY ? { "X-API-KEY": API_KEY } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new BackendError(response.status, await readErrorMessage(response));
    }

    // DELETE 는 본문이 비어 있다.
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } catch (error) {
    if (error instanceof BackendError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new BackendError(504, "분석이 시간 내에 끝나지 않았습니다. 다시 시도해 주세요.");
    }
    // 백엔드가 안 떠 있을 때가 대부분이라 그렇게 안내한다.
    throw new BackendError(
      503,
      `백엔드(${BASE_URL})에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** 백엔드는 오류를 {"error": "..."} 형태로 돌려준다. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    // 본문이 JSON 이 아니면 아래 기본 문구로 떨어진다.
  }
  return `요청이 실패했습니다 (HTTP ${response.status}).`;
}

export function analyze(text: string, relationshipType: RelationshipType) {
  return callBackend<NuanceResponse>("/analyze", {
    method: "POST",
    body: { text, relationshipType },
  });
}

export function getHistory() {
  return callBackend<AnalysisHistory[]>("/api/history", { timeoutMs: 15_000 });
}

export function deleteHistory(id: number) {
  return callBackend<void>(`/api/history/${id}`, { method: "DELETE", timeoutMs: 15_000 });
}

export function getPhrases(situation?: string) {
  const path = situation
    ? `/api/phrases/search?situation=${encodeURIComponent(situation)}`
    : "/api/phrases";
  return callBackend<BusinessPhrase[]>(path, { timeoutMs: 15_000 });
}
