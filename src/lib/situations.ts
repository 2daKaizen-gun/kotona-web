import type { components } from "@/types/api";

export type Situation = NonNullable<components["schemas"]["BusinessPhrase"]["situation"]>;

/**
 * 백엔드 Situation enum 의 표시명.
 *
 * Record<Situation, …> 로 두었기 때문에 백엔드에 상황이 추가되어 api.d.ts 를 재생성하면
 * 여기서 타입 오류가 난다. 새 상황이 필터와 입력 폼에서 조용히 빠지지 않게 하려는 것이다.
 *
 * backend.ts 와 분리한 이유: 이 값은 클라이언트 컴포넌트가 런타임에 쓰고,
 * backend.ts 는 서버 전용이다.
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
