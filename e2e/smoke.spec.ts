import { expect, test } from "@playwright/test";

/** 데모 모드 빌드에서 사이트가 뜨는지 확인한다. */
test("사이트가 뜨고 예시 모드라고 밝힌다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/KOTONA/);
  // 배너가 있으면 KOTONA_DEMO 가 빌드 시점에 전달된 것이다
  await expect(page.getByRole("status")).toContainText("예시 모드");
});
