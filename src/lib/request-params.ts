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
