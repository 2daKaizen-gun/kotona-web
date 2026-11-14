import { defineConfig, devices } from "@playwright/test";

/**
 * 브라우저 E2E. 데모 모드로 띄워서 백엔드, DB, API 키 없이 돈다.
 * 브라우저 → route handler → 데이터 연결을 확인한다.
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
    // KOTONA_DEMO 는 빌드 시점에 읽히므로 dev 서버가 아니라 빌드 결과를 띄운다.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { KOTONA_DEMO: "true" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
