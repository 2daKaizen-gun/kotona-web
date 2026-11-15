/**
 * 백엔드 없이 배포된 사이트인지. KOTONA_DEMO 환경변수로만 켠다.
 * 백엔드 장애 때 자동으로 예시로 넘어가면 가짜 데이터를 진짜처럼 보이게 되므로 그렇게 하지 않는다.
 * 서버에서만 읽힌다.
 */
export const DEMO_MODE = process.env.KOTONA_DEMO === "true";
