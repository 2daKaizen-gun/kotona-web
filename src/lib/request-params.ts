/**
 * route handler 가 받는 쿼리·경로 파라미터를 숫자로 바꾼다.
 *
 * <p>같은 코드가 네 파일에 복사돼 있었고, 그중 하나만 고쳐도 나머지는 조용히 옛날대로
 * 동작했다. 실제로 그랬다 — {@link toNumber} 는 값이 아예 없을 때 기본값 대신 0 을
 * 돌려줬다. `Number(null)` 은 NaN 이 아니라 0 이고, 0 은 유한하기 때문이다.
 * 백엔드는 크기 0 을 1 로 올려 받으므로, size 를 생략한 요청은 한 건씩만 돌아왔다.
 */

/** 없거나 숫자가 아니면 기본값. 상·하한은 백엔드가 다시 건다. */
export function toNumber(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** 경로의 id. 1 이상의 정수가 아니면 null — 호출한 쪽이 400 으로 돌려보낸다. */
export function toId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * 요청한 사용자의 IP. 플랫폼이 붙인 `x-forwarded-for` 의 첫 주소, 없으면 `x-real-ip`.
 *
 * <p>백엔드의 분당 제한은 IP 마다 센다. 이 값을 넘기지 않으면 모든 요청이 이 서버 하나의 주소로
 * 보여서, 사용자 전원이 한 버킷을 나눠 쓴다. 백엔드는 이 헤더를 API 키가 맞은 호출에서만 믿는다.
 *
 * <p>이 헤더를 믿을 수 있는 것은 앞단이 덮어쓰기 때문이다 — Vercel 은 클라이언트가 보낸 값을
 * 버리고 자기가 본 주소를 쓴다. 덮어쓰지 않는 프록시 뒤에 직접 띄우면 사용자가 자기 버킷을 고를 수
 * 있지만, 그 사용자는 이미 사이트 비밀번호를 통과한 사람이다.
 */
export function clientIpOf(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || undefined;
}
