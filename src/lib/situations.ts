import type { components } from "@/types/api";

export type Situation = NonNullable<components["schemas"]["BusinessPhrase"]["situation"]>;

/**
 * Situation enum 표시명. Record<Situation, …> 라 백엔드에 값이 추가되면 타입 오류가 난다.
 * 클라이언트에서 쓰므로 서버 전용인 backend.ts 와 분리했다.
 */
export const SITUATION_LABELS: Record<Situation, string> = {
  EMAIL: "메일",
  MEETING: "회의",
  INTERVIEW: "면접",
  NEGOTIATION: "협상",
  CONFIRMATION: "확인",
  REQUEST: "요청",
  NOTIFICATION: "공지",
  CUSHION: "쿠션어",
};

export const SITUATIONS = Object.keys(SITUATION_LABELS) as Situation[];
