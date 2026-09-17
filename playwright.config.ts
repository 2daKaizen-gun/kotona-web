import { defineConfig, devices } from "@playwright/test";

/**
 * 브라우저에서 사이트 전체를 돌려 본다.
 *
 * 데모 모드로 띄우기 때문에 백엔드도, DB 도, API 키도 필요 없다. 보통 E2E 를 CI 에
 * 못 넣는 이유(외부 의존성과 호출당 비용)가 여기서는 성립하지 않는다.
 * 대신 이 테스트가 보는 것은 "브라우저 → route handler → 데이터" 라는 이음새다 —
 * 단위 테스트는 각 층을 따로 보지만, 층이 실제로 이어지는지는 아무도 보지 않았다.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // KOTONA_DEMO 는 빌드 시점에 읽힌다(정적 페이지에 배너가 구워진다).
    // 그래서 dev 서버가 아니라, 플래그를 켠 채로 빌드한 결과를 띄운다 — 배포와 같은 조건이다.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { KOTONA_DEMO: "true" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
