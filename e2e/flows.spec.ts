import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * 데모 모드의 쓰기 거절 문구.
 *
 * <p>role=alert 로만 찾으면 둘이 잡힌다 — Next.js App Router 가 페이지 전환을 알리려고
 * 보이지 않는 role=alert 요소를 따로 심어 두기 때문이다. jsdom 단위 테스트에서는
 * 드러나지 않고 실제 브라우저에서만 보인다.
 */
function refusal(page: Page) {
  return page.getByRole("alert").filter({ hasText: "예시를 보여 주는 중이라" });
}

/**
 * 사용자가 실제로 하는 일을 처음부터 끝까지 따라간다.
 * 각 단계는 단위 테스트가 이미 보고 있다. 여기서 보는 것은 단계 사이의 이음새다 —
 * 브라우저가 route handler 에 닿고, route handler 가 데이터에 닿는지.
 */

test.describe("분석", () => {
  test("예시 문장을 골라 분석하면 결과가 나온다", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /ご提案の件/ }).click();
    await page.getByText("사외 / 고객사").click();
    await page.getByRole("button", { name: "분석하기" }).click();

    await expect(page.getByText("73", { exact: true })).toBeVisible();
    await expect(page.getByText("리스크 주의")).toBeVisible();
    await expect(page.getByRole("heading", { name: "本音 / 建前" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "추천 답장" })).toBeVisible();
  });

  test("결과 카드에 샘플이라고 적혀 있다", async ({ page }) => {
    // 결과만 캡처해서 공유해도 예시라는 게 남아야 한다
    await page.goto("/");
    await page.getByRole("button", { name: /ご提案の件/ }).click();
    await page.getByRole("button", { name: "분석하기" }).click();

    // 배너에도 "샘플" 이 있으니 결과 영역 안에서 찾는다
    await expect(page.getByRole("main").getByText("샘플", { exact: true })).toBeVisible();
  });

  test("입력에 따라 다른 결과가 나온다", async ({ page }) => {
    // 무엇을 넣어도 같은 결과면 고장 난 것처럼 보인다
    await page.goto("/");
    const input = page.getByLabel("분석할 일본어 문장");
    const analyse = page.getByRole("button", { name: "분석하기" });

    await input.fill("よろしく");
    await analyse.click();
    await expect(page.getByText("20", { exact: true })).toBeVisible();

    await input.fill("お手数ですが、ご確認いただけますでしょうか。");
    await analyse.click();
    await expect(page.getByText("92", { exact: true })).toBeVisible();
  });

  test("일본어가 아닌 입력은 거절된다", async ({ page }) => {
    // 백엔드 없이도 route handler 가 빈 입력을 막는지
    await page.goto("/");
    await page.getByLabel("분석할 일본어 문장").fill("   ");

    await expect(page.getByRole("button", { name: "분석하기" })).toBeDisabled();
  });

  test("추천 답장을 복사할 수 있다", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.getByRole("button", { name: /ご提案の件/ }).click();
    await page.getByRole("button", { name: "분석하기" }).click();

    await page.getByRole("button", { name: "복사" }).first().click();

    await expect(page.getByRole("button", { name: "복사됨" })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    // 복사되는 것은 일본어 답장 본문이어야 한다
    expect(copied).toMatch(/[\u3041-\u30FF]/);
  });
});

test.describe("이력", () => {
  test("목록이 뜨고 행을 펼치면 당시 결과가 보인다", async ({ page }) => {
    await page.goto("/history");

    await expect(page.getByText(/전체 3건 중 3건 표시/)).toBeVisible();

    // 펼치는 순간 상세를 따로 가져온다 — 목록과 상세가 다른 요청이라는 게 실제로 동작하는지
    const detail = page.waitForResponse((response) => /\/api\/history\/\d+$/.test(response.url()));
    await page.getByText("ご提案の件、社内で検討させていただきます。").click();
    await detail;

    await expect(page.getByText("73", { exact: true })).toBeVisible();
  });

  test("예시 모드에서는 삭제를 거절하고 이유를 말한다", async ({ page }) => {
    // 조용히 성공한 척하면 사용자는 지워진 줄 안다
    await page.goto("/history");
    await page.getByRole("button", { name: "삭제" }).first().click();
    await page.getByRole("button", { name: "삭제 확인" }).click();

    await expect(refusal(page)).toBeVisible();
    // 행은 그대로 남아 있어야 한다
    await expect(page.getByText(/전체 3건 중 3건 표시/)).toBeVisible();
  });
});

test.describe("사전", () => {
  test("상황을 고르면 해당 표현만 남는다", async ({ page }) => {
    await page.goto("/phrases");
    await expect(page.getByText(/전체 7건 중 7건 표시/)).toBeVisible();

    await page.getByRole("button", { name: "쿠션어" }).click();

    await expect(page.getByText(/쿠션어 1건 중 1건 표시/)).toBeVisible();
    // getByText 는 기본이 부분 일치라, 이 표현으로 시작하는 예문까지 잡힌다
    await expect(page.getByText("恐縮でございますが", { exact: true })).toBeVisible();
    await expect(page.getByText("承知いたしました", { exact: true })).not.toBeVisible();
  });

  test("정중도가 높은 표현이 먼저 나온다", async ({ page }) => {
    await page.goto("/phrases");
    await expect(page.getByText(/전체 7건/)).toBeVisible();

    // 내비게이션도 <li> 를 쓴다. 본문 안으로 좁히지 않으면 첫 항목이 "분석" 메뉴가 된다.
    const first = page.getByRole("main").getByRole("listitem").first();
    await expect(first).toContainText("承知いたしました");
  });

  test("예시 모드에서는 표현 추가를 거절하고, 입력한 내용은 지킨다", async ({ page }) => {
    await page.goto("/phrases");
    await page.getByRole("button", { name: "+ 표현 추가" }).click();

    await page.getByLabel(/표현/).fill("ご査収ください");
    await page.getByLabel(/뜻/).fill("확인해 주십시오");
    await page.getByRole("button", { name: "저장" }).click();

    // 거절 이유가 폼 안에 보이고, 입력한 내용은 그대로 남아 있다
    await expect(refusal(page)).toBeVisible();
    await expect(page.getByLabel(/표현/)).toHaveValue("ご査収ください");
  });
});

test.describe("탐색", () => {
  test("메뉴로 세 페이지를 오가고 배너는 계속 보인다", async ({ page }) => {
    await page.goto("/");

    for (const [label, path] of [
      ["이력", "/history"],
      ["사전", "/phrases"],
      ["분석", "/"],
    ] as const) {
      await page.getByRole("navigation").getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("status")).toContainText("예시 모드");
      await expect(page.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    }
  });
});
