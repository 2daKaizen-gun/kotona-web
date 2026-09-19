import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * route handler 를 진짜 백엔드 대신 가짜 fetch 위에서 돌린다.
 *
 * <p>브라우저 테스트는 예시 모드로만 돈다. 백엔드가 필요 없다는 게 장점이지만, 그래서
 * 실제로 백엔드를 부르는 쪽 — 주소를 만들고, API 키를 붙이고, 상태코드를 옮기고,
 * 연결 실패를 사람이 읽을 문장으로 바꾸는 코드 — 는 CI 에서 한 번도 실행되지 않았다.
 * 여기서 그 분기를 본다.
 *
 * <p>모듈을 그때그때 불러오는 이유는 backend.ts 가 주소와 키를 로드 시점에 읽기 때문이다.
 */
const BASE = "http://backend.test";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  process.env.KOTONA_API_URL = BASE;
  delete process.env.KOTONA_API_KEY;
  delete process.env.KOTONA_DEMO;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** 백엔드가 이렇게 답했다고 치자. */
function backendAnswers(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(
    new Response(body === undefined ? "" : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function post(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** 마지막 호출의 주소와 옵션. */
function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
}

describe("POST /api/analyze", () => {
  it("문장과 관계를 백엔드로 넘기고 결과를 그대로 돌려준다", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    backendAnswers({ totalScore: 73 });

    const response = await POST(post("http://x/api/analyze", { text: "  ご確認  ", relationshipType: "EXTERNAL" }));

    expect(await response.json()).toEqual({ totalScore: 73 });
    expect(lastCall().url).toBe(`${BASE}/analyze`);
    // 앞뒤 공백은 걷어서 보낸다 — 백엔드가 길이로 판정하는 곳이 있다
    expect(JSON.parse(lastCall().init.body as string)).toEqual({
      text: "ご確認",
      relationshipType: "EXTERNAL",
    });
  });

  it("관계를 비워 두면 사내로 보낸다", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    backendAnswers({ totalScore: 50 });

    await POST(post("http://x/api/analyze", { text: "ご確認" }));

    expect(JSON.parse(lastCall().init.body as string).relationshipType).toBe("INTERNAL");
  });

  it("모르는 관계는 백엔드까지 가지 않고 거절한다", async () => {
    // 예전에는 조용히 INTERNAL 로 바꿔 보냈다. 묻지 않은 맥락의 점수가 돌아왔다는 뜻이다.
    const { POST } = await import("@/app/api/analyze/route");

    const response = await POST(post("http://x/api/analyze", { text: "ご確認", relationshipType: "EMAIL" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("INTERNAL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("빈 문장은 백엔드를 부르지 않는다", async () => {
    // 왕복 25초와 쿼터를 쓰기 전에 막는다
    const { POST } = await import("@/app/api/analyze/route");

    const response = await POST(post("http://x/api/analyze", { text: "   " }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("한도를 넘는 문장은 백엔드까지 가지 않는다", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    const { ANALYZE_TEXT_MAX } = await import("@/lib/limits");

    const response = await POST(post("http://x/api/analyze", { text: "あ".repeat(ANALYZE_TEXT_MAX + 1) }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain(String(ANALYZE_TEXT_MAX));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("본문이 JSON 이 아니면 400 이다", async () => {
    const { POST } = await import("@/app/api/analyze/route");

    const response = await POST(post("http://x/api/analyze", "{not json"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("API 키는 설정됐을 때만, 서버에서만 붙인다", async () => {
    // 키가 브라우저로 나가면 보호가 사라진다. 이 헤더를 붙이는 것이 BFF 가 있는 이유다.
    process.env.KOTONA_API_KEY = "secret-key";
    vi.resetModules();
    const { POST } = await import("@/app/api/analyze/route");
    backendAnswers({ totalScore: 1 });

    const response = await POST(post("http://x/api/analyze", { text: "ご確認" }));

    expect(lastCall().headers.get("X-API-KEY")).toBe("secret-key");
    // 응답에는 흔적이 없어야 한다
    expect(JSON.stringify(await response.json())).not.toContain("secret-key");
  });

  it("키가 없으면 헤더도 없다", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    backendAnswers({ totalScore: 1 });

    await POST(post("http://x/api/analyze", { text: "ご確認" }));

    expect(lastCall().headers.has("X-API-KEY")).toBe(false);
  });

  it("백엔드의 상태코드와 문구를 그대로 옮긴다", async () => {
    // 429 는 화면에서 "잠시 후 다시" 로, 500 은 다르게 다뤄진다. 뭉개면 안내가 틀어진다.
    const { POST } = await import("@/app/api/analyze/route");
    backendAnswers({ error: "AI API 호출 한도를 초과했습니다." }, 429);

    const response = await POST(post("http://x/api/analyze", { text: "ご確認" }));

    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain("한도를 초과");
  });

  it("백엔드가 꺼져 있으면 그렇게 말한다", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(post("http://x/api/analyze", { text: "ご確認" }));

    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("연결할 수 없습니다");
  });

  it("시간 안에 안 끝나면 504 로 안내한다", async () => {
    // 프레임워크가 요청을 자르기 전에 우리 문구가 먼저 도착해야 한다
    const { POST } = await import("@/app/api/analyze/route");
    const aborted = new Error("aborted");
    aborted.name = "AbortError";
    fetchMock.mockRejectedValue(aborted);

    const response = await POST(post("http://x/api/analyze", { text: "ご確認" }));

    expect(response.status).toBe(504);
  });

  it("백엔드 오류 본문이 JSON 이 아니어도 무너지지 않는다", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    fetchMock.mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    const response = await POST(post("http://x/api/analyze", { text: "ご確認" }));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("502");
  });
});

describe("GET /api/history", () => {
  it("페이지와 크기를 백엔드로 넘긴다", async () => {
    const { GET } = await import("@/app/api/history/route");
    backendAnswers({ content: [], totalElements: 0 });

    await GET(new Request("http://x/api/history?page=2&size=5"));

    expect(lastCall().url).toBe(`${BASE}/api/history?page=2&size=5`);
  });

  it("숫자가 아닌 페이지는 기본값으로 바꾼다", async () => {
    // 상·하한은 백엔드가 다시 건다. 여기서는 숫자로만 만들어 넘긴다.
    const { GET } = await import("@/app/api/history/route");
    backendAnswers({ content: [] });

    await GET(new Request("http://x/api/history?page=abc&size="));

    expect(lastCall().url).toBe(`${BASE}/api/history?page=0&size=20`);
  });
});

describe("/api/history/[id]", () => {
  const context = (id: string) => ({ params: Promise.resolve({ id }) });

  it("한 건을 가져온다", async () => {
    const { GET } = await import("@/app/api/history/[id]/route");
    backendAnswers({ id: 8, totalScore: 73 });

    const response = await GET(new Request("http://x/api/history/8"), context("8"));

    expect(await response.json()).toMatchObject({ id: 8 });
    expect(lastCall().url).toBe(`${BASE}/api/history/8`);
  });

  it("id 가 숫자가 아니면 백엔드를 부르지 않는다", async () => {
    const { GET } = await import("@/app/api/history/[id]/route");

    const response = await GET(new Request("http://x/api/history/abc"), context("abc"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("없는 id 는 404 를 그대로 전한다", async () => {
    const { GET } = await import("@/app/api/history/[id]/route");
    backendAnswers({ error: "id=999 인 분석 이력을 찾을 수 없습니다." }, 404);

    const response = await GET(new Request("http://x/api/history/999"), context("999"));

    expect(response.status).toBe(404);
  });

  it("삭제는 본문 없이 204 로 답한다", async () => {
    const { DELETE } = await import("@/app/api/history/[id]/route");
    // 204 는 본문을 가질 수 없다 — Response 생성자가 빈 문자열도 거절한다
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await DELETE(new Request("http://x/api/history/8"), context("8"));

    expect(response.status).toBe(204);
    expect(lastCall().init.method).toBe("DELETE");
    expect(await response.text()).toBe("");
  });
});

describe("/api/phrases", () => {
  it("상황 필터는 검색 엔드포인트로 간다", async () => {
    // /api/phrases 에 situation 을 붙이면 백엔드가 그 값을 무시하고 전부 돌려준다
    const { GET } = await import("@/app/api/phrases/route");
    backendAnswers({ content: [] });

    await GET(new Request("http://x/api/phrases?situation=CUSHION"));

    expect(lastCall().url).toBe(`${BASE}/api/phrases/search?situation=CUSHION&page=0&size=20`);
  });

  it("필터가 없으면 목록 엔드포인트로 간다", async () => {
    const { GET } = await import("@/app/api/phrases/route");
    backendAnswers({ content: [] });

    await GET(new Request("http://x/api/phrases"));

    expect(lastCall().url).toBe(`${BASE}/api/phrases?page=0&size=20`);
  });

  it("추가는 201 로 답한다", async () => {
    const { POST } = await import("@/app/api/phrases/route");
    backendAnswers({ id: 9, phrase: "ご査収ください" }, 201);

    const response = await POST(post("http://x/api/phrases", { phrase: "ご査収ください", meaning: "확인" }));

    expect(response.status).toBe(201);
    expect(lastCall().init.method).toBe("POST");
  });

  it("이미 있는 표현이면 409 와 그 이유를 전한다", async () => {
    // 화면은 이 문구를 폼 안에 그대로 보여 준다
    const { POST } = await import("@/app/api/phrases/route");
    backendAnswers({ error: "이미 등록된 표현입니다: 承知いたしました" }, 409);

    const response = await POST(post("http://x/api/phrases", { phrase: "承知いたしました", meaning: "네" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("이미 등록된 표현");
  });

  it("수정은 통째로 교체한다", async () => {
    const { PUT } = await import("@/app/api/phrases/[id]/route");
    backendAnswers({ id: 3 });
    const body = { phrase: "念のため", meaning: "만약을 위해", situation: "EMAIL", politenessLevel: 2 };

    const response = await PUT(post("http://x/api/phrases/3", body), { params: Promise.resolve({ id: "3" }) });

    expect(response.status).toBe(200);
    expect(lastCall().init.method).toBe("PUT");
    expect(JSON.parse(lastCall().init.body as string)).toEqual(body);
  });

  it("id 가 0 이나 음수면 거절한다", async () => {
    const { DELETE } = await import("@/app/api/phrases/[id]/route");

    for (const id of ["0", "-1", "1.5"]) {
      const response = await DELETE(new Request("http://x"), { params: Promise.resolve({ id }) });
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
