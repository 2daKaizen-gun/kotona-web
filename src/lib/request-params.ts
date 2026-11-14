/** route handler 의 쿼리·경로 파라미터 변환. */

/** 없거나 숫자가 아니면 기본값. (`Number(null)` 은 0 이라 따로 처리한다) 범위는 백엔드가 맞춘다. */
export function toNumber(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** 1 이상의 정수 id, 아니면 null */
export function toId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * 사용자 IP. `x-forwarded-for` 의 첫 주소, 없으면 `x-real-ip`.
 * 넘기지 않으면 백엔드가 모든 사용자를 이 서버 하나로 센다. Vercel 은 이 헤더를 덮어쓴다.
 */
export function clientIpOf(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || undefined;
}
