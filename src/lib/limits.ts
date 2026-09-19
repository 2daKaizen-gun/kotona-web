/**
 * 입력 한도. 값의 출처는 백엔드의 `@Size` 이고, OpenAPI 스펙의 `maxLength` 로 넘어온다.
 *
 * <p>생성된 타입(api.d.ts)은 모양만 담고 한도는 담지 않아서 여기 다시 적는다. 대신
 * `__tests__/limits.test.ts` 가 체크인된 스펙과 이 값을 비교한다 — 백엔드가 한도를 바꾸고
 * 스펙을 다시 받으면, 여기를 고치기 전까지 테스트가 실패한다.
 *
 * <p>스펙 JSON 을 직접 import 하지 않는 이유: 클라이언트 컴포넌트가 이 파일을 쓰므로
 * 스펙 전체가 브라우저 번들에 실린다. 숫자 네 개를 위해 치를 값이 아니다.
 *
 * <p>글자 수는 백엔드와 같이 `String.length`(UTF-16) 기준이다.
 */
export const ANALYZE_TEXT_MAX = 2000;
export const PHRASE_MAX = 255;
export const MEANING_MAX = 255;
export const USAGE_EXAMPLE_MAX = 500;
