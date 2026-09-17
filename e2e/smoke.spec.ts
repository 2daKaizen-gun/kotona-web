import { expect, test } from "@playwright/test";

/**
 * 배포와 같은 조건(데모 모드 빌드)에서 사이트가 뜨는지만 본다.
 * 이게 깨지면 나머지 E2E 는 볼 필요도 없다.
 */
test("사이트가 뜨고 예시 모드라고 밝힌다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/KOTONA/);
  // 정적 페이지에 배너가 구워졌는지 — KOTONA_DEMO 가 빌드 시점에 전달됐다는 증거다
  await expect(page.getByRole("status")).toContainText("예시 모드");
});
