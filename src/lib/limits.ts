/**
 * 입력 한도. 백엔드 `@Size` 값이고 OpenAPI 스펙의 maxLength 와 같은지 limits.test.ts 가 확인한다.
 * 스펙 JSON 을 import 하면 브라우저 번들이 커져서 숫자만 적는다. 글자 수는 String.length 기준.
 */
export const ANALYZE_TEXT_MAX = 2000;
export const PHRASE_MAX = 255;
export const MEANING_MAX = 255;
export const USAGE_EXAMPLE_MAX = 500;
