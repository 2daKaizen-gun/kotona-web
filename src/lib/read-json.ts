/**
 * 화면이 route handler 의 응답을 읽는 방법.
 *
 * <p>route handler 는 늘 JSON 으로 답하지만, 그 앞에 있는 것들은 그렇지 않다. 호스팅 플랫폼이
 * 실행 시간을 넘긴 요청을 자르면 HTML 오류 페이지가 온다. 그 본문을 `response.json()` 으로 읽으면
 * 던지고, 예전 화면들은 그 예외를 두 가지로 잘못 보여 줬다 — 분석 화면은 "네트워크 오류" 라고 했고,
 * 이력·사전 화면은 `Unexpected token '<'` 를 그대로 띄웠다. 어느 쪽도 일어난 일이 아니다.
 */

/** 본문이 JSON 이면 그 값, 아니면 null. 던지지 않는다. */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** route handler 가 준 `{ error }` 문구. 없으면 무엇이 실패했는지와 상태 코드를 말한다. */
export function errorMessage(data: unknown, status: number, what: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return `${what} (HTTP ${status})`;
}
