import type { components } from "@/types/api";
import { DEMO_MODE } from "@/lib/demo-mode";
import {
  demoHistoryPage,
  demoPhrasePage,
  findDemoHistory,
  pickDemoAnalysis,
} from "@/lib/demo-data";

export type NuanceResponse = components["schemas"]["NuanceResponseDTO"];
export type BusinessPhrase = components["schemas"]["BusinessPhrase"];
export type PhraseRequest = components["schemas"]["PhraseRequestDTO"];
export type AnalysisHistory = components["schemas"]["AnalysisHistory"];
export type AnalysisHistorySummary = components["schemas"]["AnalysisHistorySummaryDTO"];
export type HistoryPage = components["schemas"]["PageResponseAnalysisHistorySummaryDTO"];
export type PhrasePage = components["schemas"]["PageResponseBusinessPhrase"];

/**
 * 백엔드 enum 에서 그대로 가져온다. 손으로 다시 적어 두면 값이 늘어날 때 조용히 갈라지고,
 * 화면에는 있지만 백엔드가 모르는 선택지(또는 그 반대)가 생긴다.
 */
export type RelationshipType = NonNullable<
  components["schemas"]["AnalyzeRequestDTO"]["relationshipType"]
>;

/** 런타임 확인용. 타입은 컴파일되면 사라지므로, 들어온 값은 값으로 확인해야 한다. */
export const RELATIONSHIP_TYPES = [
  "INTERNAL",
  "EXTERNAL",
  "INTERVIEW",
] as const satisfies readonly RelationshipType[];

export function isRelationshipType(value: unknown): value is RelationshipType {
  return (RELATIONSHIP_TYPES as readonly string[]).includes(value as string);
}

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
      throw new BackendError(504, "요청이 시간 내에 끝나지 않았습니다. 다시 시도해 주세요.");
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

/**
 * 예시를 보여 주는 중에는 저장할 곳이 없다.
 *
 * <p>성공한 척하는 선택지도 있었지만 그러지 않는다. 서버리스에서는 요청 사이에 상태가
 * 남지 않으므로 새로고침하면 되돌아가고, 무엇보다 사용자가 저장됐다고 믿게 만든다.
 * 403 은 "요청은 이해했으나 거절한다" 이고, 지금 상황이 정확히 그렇다.
 */
function demoWriteRefused<T>(): Promise<T> {
  return Promise.reject(
    new BackendError(
      403,
      "예시를 보여 주는 중이라 변경할 수 없습니다. 분석 서버에 연결하면 사용할 수 있습니다.",
    ),
  );
}

export function analyze(text: string, relationshipType: RelationshipType) {
  if (DEMO_MODE) {
    return Promise.resolve(pickDemoAnalysis(text));
  }
  return callBackend<NuanceResponse>("/analyze", {
    method: "POST",
    body: { text, relationshipType },
  });
}

/**
 * 이력 목록. 요약만 담기므로 저장된 분석 결과 전체는 여기 없다 —
 * 한 건을 펼칠 때 getHistoryDetail 로 그 행만 가져온다.
 */
export function getHistory(page = 0, size = 20) {
  if (DEMO_MODE) {
    return Promise.resolve(demoHistoryPage(page, size));
  }
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return callBackend<HistoryPage>(`/api/history?${query}`, { timeoutMs: 15_000 });
}

export function getHistoryDetail(id: number) {
  if (DEMO_MODE) {
    const found = findDemoHistory(id);
    return found
      ? Promise.resolve(found)
      : Promise.reject(new BackendError(404, `id=${id} 인 분석 이력을 찾을 수 없습니다.`));
  }
  return callBackend<AnalysisHistory>(`/api/history/${id}`, { timeoutMs: 15_000 });
}

export function deleteHistory(id: number) {
  if (DEMO_MODE) return demoWriteRefused();
  return callBackend<void>(`/api/history/${id}`, { method: "DELETE", timeoutMs: 15_000 });
}

export function getPhrases(situation: string | undefined, page = 0, size = 20) {
  if (DEMO_MODE) {
    return Promise.resolve(demoPhrasePage(situation, page, size));
  }
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  const path = situation
    ? `/api/phrases/search?situation=${encodeURIComponent(situation)}&${query}`
    : `/api/phrases?${query}`;
  return callBackend<PhrasePage>(path, { timeoutMs: 15_000 });
}

// 사전 쓰기는 백엔드가 API 키를 요구한다. 읽기와 달리 브라우저에서 직접 부를 수 없는 이유다.
export function createPhrase(body: PhraseRequest) {
  if (DEMO_MODE) return demoWriteRefused();
  return callBackend<BusinessPhrase>("/api/phrases", { method: "POST", body, timeoutMs: 15_000 });
}

export function updatePhrase(id: number, body: PhraseRequest) {
  if (DEMO_MODE) return demoWriteRefused();
  return callBackend<BusinessPhrase>(`/api/phrases/${id}`, { method: "PUT", body, timeoutMs: 15_000 });
}

export function deletePhrase(id: number) {
  if (DEMO_MODE) return demoWriteRefused();
  return callBackend<void>(`/api/phrases/${id}`, { method: "DELETE", timeoutMs: 15_000 });
}
