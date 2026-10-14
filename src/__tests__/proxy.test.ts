// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

/**
 * 사이트 앞의 비밀번호. 이것이 없던 동안 공개된 프론트는 곧 공개된 백엔드였다 —
 * route handler 가 누구의 요청에든 API 키를 붙여 백엔드로 넘겼기 때문이다.
 */
describe("proxy (사이트 비밀번호)", () => {
  beforeEach(() => {
    delete process.env.KOTONA_SITE_PASSWORD;
    delete process.env.KOTONA_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function request(path: string, authorization?: string) {
    return new NextRequest(`http://localhost${path}`, {
      headers: authorization ? { authorization } : {},
    });
  }

  function basic(user: string, password: string) {
    return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
  }

  it("비밀번호가 설정되지 않으면 그대로 통과시킨다 (로컬·예시 모드)", () => {
    const response = proxy(request("/api/history"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/", "/history", "/api/history", "/api/analyze", "/api/phrases/1", "/api/%68istory"])(
    "비밀번호가 설정되면 %s 는 인증 없이 401",
    (path) => {
      process.env.KOTONA_SITE_PASSWORD = "s3cret";

      const response = proxy(request(path));

      expect(response.status).toBe(401);
      // 브라우저가 이 헤더를 보고 로그인 창을 띄운다
      expect(response.headers.get("www-authenticate")).toContain("Basic");
    },
  );

  it("맞는 비밀번호면 사용자 이름과 무관하게 통과", () => {
    process.env.KOTONA_SITE_PASSWORD = "s3cret";

    expect(proxy(request("/api/history", basic("anyone", "s3cret"))).status).toBe(200);
    expect(proxy(request("/api/history", basic("", "s3cret"))).status).toBe(200);
  });

  it("틀린 비밀번호, 깨진 헤더, Basic 이 아닌 방식은 401", () => {
    process.env.KOTONA_SITE_PASSWORD = "s3cret";

    expect(proxy(request("/", basic("user", "wrong"))).status).toBe(401);
    expect(proxy(request("/", basic("user", "s3cret-and-more"))).status).toBe(401);
    expect(proxy(request("/", "Basic !!!not-base64"))).toHaveProperty("status", 401);
    expect(proxy(request("/", "Bearer s3cret")).status).toBe(401);
  });

  it("비밀번호에 콜론과 한글이 있어도 읽는다", () => {
    // Basic 은 첫 콜론에서만 나눈다. 비밀번호 쪽의 콜론까지 자르면 맞는 비밀번호가 거절된다.
    process.env.KOTONA_SITE_PASSWORD = "가나:다라";

    expect(proxy(request("/", basic("u", "가나:다라"))).status).toBe(200);
  });

  it("키는 있는데 비밀번호가 없으면 경고한다 — 공개 배포라면 백엔드가 열려 있다", () => {
    process.env.KOTONA_API_KEY = "backend-key";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    proxy(request("/"));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("KOTONA_SITE_PASSWORD"));
  });

  it("빌드 산출물과 아이콘은 막지 않는다", () => {
    const [pattern] = config.matcher;
    const matcher = new RegExp(`^${pattern}$`);

    expect(matcher.test("/_next/static/chunks/app.js")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
    expect(matcher.test("/api/history")).toBe(true);
    expect(matcher.test("/")).toBe(true);
  });
});
