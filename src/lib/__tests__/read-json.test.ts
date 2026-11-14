import { describe, expect, it } from "vitest";
import { errorMessage, readJson } from "@/lib/read-json";

/** HTML 오류 페이지가 와도 `Unexpected token '<'` 같은 문구가 나가지 않는지. */
describe("readJson", () => {
  it("JSON 본문은 그대로 돌려준다", async () => {
    expect(await readJson(new Response('{"error":"없음"}'))).toEqual({ error: "없음" });
  });

  it("JSON 이 아니면 던지지 않고 null", async () => {
    expect(await readJson(new Response("<html>504 Gateway Timeout</html>"))).toBeNull();
  });
});

describe("errorMessage", () => {
  it("route handler 가 준 문구를 쓴다", () => {
    expect(errorMessage({ error: "이미 등록된 표현입니다" }, 409, "저장하지 못했습니다.")).toBe(
      "이미 등록된 표현입니다",
    );
  });

  it("문구가 없으면 무엇이 실패했는지와 상태 코드를 말한다", () => {
    expect(errorMessage(null, 504, "이력을 불러오지 못했습니다.")).toBe(
      "이력을 불러오지 못했습니다. (HTTP 504)",
    );
    expect(errorMessage({ error: 42 }, 500, "실패")).toBe("실패 (HTTP 500)");
  });

  it("파싱 오류 문구를 내보내지 않는다", () => {
    expect(errorMessage(null, 502, "사전을 불러오지 못했습니다.")).not.toContain("Unexpected token");
  });
});
