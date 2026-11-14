import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 사이트 전체 비밀번호(Basic 인증).
 * route handler 가 백엔드 키를 붙여 주므로, 프론트를 공개하면 이것으로 막아야 한다.
 * KOTONA_SITE_PASSWORD 가 없으면(로컬, 데모) 열어 둔다.
 */
export function proxy(request: NextRequest) {
  const password = process.env.KOTONA_SITE_PASSWORD;
  if (!password) {
    warnIfTheKeyIsUnguarded();
    return NextResponse.next();
  }

  if (matches(passwordFrom(request.headers.get("authorization")), password)) {
    return NextResponse.next();
  }

  return new NextResponse("비밀번호가 필요합니다.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="KOTONA", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // 정적 파일과 아이콘은 제외
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

/** Basic 인증 헤더의 비밀번호. 사용자 이름은 보지 않는다. */
function passwordFrom(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice("Basic ".length).trim(), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return colon === -1 ? null : decoded.slice(colon + 1);
}

/** 상수 시간 비교. 길이가 달라도 되도록 둘 다 해시한 뒤 비교한다. */
function matches(provided: string | null, expected: string): boolean {
  if (provided === null) return false;
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

let warned = false;

/** 키는 있는데 비밀번호가 없으면 한 번 경고한다. */
function warnIfTheKeyIsUnguarded() {
  if (warned || !process.env.KOTONA_API_KEY) return;
  warned = true;
  console.warn(
    "KOTONA_API_KEY 는 설정됐는데 KOTONA_SITE_PASSWORD 가 없습니다. 이 사이트에 닿는 누구나 " +
      "백엔드를 키를 가진 채로 부를 수 있습니다. 공개 배포라면 KOTONA_SITE_PASSWORD 를 설정하세요.",
  );
}
