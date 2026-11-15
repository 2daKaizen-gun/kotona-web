/**
 * route handler 응답 읽기. 플랫폼이 시간 초과로 자르면 HTML 이 오므로
 * `response.json()` 대신 이걸 써서 예외 없이 처리한다.
 */

/** 본문이 JSON 이면 그 값, 아니면 null. 던지지 않는다. */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** `{ error }` 문구. 없으면 상태 코드로 문구를 만든다. */
export function errorMessage(data: unknown, status: number, what: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return `${what} (HTTP ${status})`;
}
