import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 사이트 전체에 거는 비밀번호 하나.
 *
 * <p>route handler 는 백엔드를 부를 때 KOTONA_API_KEY 를 붙여 준다. 그런데 그 handler 자체는 누가
 * 부르든 받아 줬다 — 프론트가 공개되면 백엔드의 키는 아무것도 지키지 못했고, 누구나 쿼터를 쓰고
 * 남의 분석 원문을 읽고 사전을 지울 수 있었다. 여기서 그 앞을 막는다.
 *
 * <p>계정이 아니라 비밀번호 하나인 이유: 이 도구를 쓰는 사람은 한 손에 꼽힌다. 사람마다 이력을
 * 나누려면 계정이 필요하지만, 그것은 다른 제품이다.
 *
 * <p>비밀번호가 없으면 열어 둔다. 로컬 개발과 예시 모드(고정 샘플뿐이라 지킬 것이 없다)가 그 경우다.
 * 경로가 아니라 사이트 전체를 막는 것은 의도다 — 경로를 골라 막으면 표기를 바꿔 우회하는 길이
 * 생긴다(백엔드에서 실제로 그랬다, kotona-analyzer#89).
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
  // 빌드 산출물과 아이콘은 비밀이 아니고, 막으면 로그인 창이 뜨기 전에 화면이 깨진다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

/** Basic 인증 헤더에서 비밀번호만 꺼낸다. 사용자 이름은 보지 않는다 — 비밀번호가 하나뿐이다. */
function passwordFrom(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice("Basic ".length).trim(), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return colon === -1 ? null : decoded.slice(colon + 1);
}

/**
 * 상수 시간 비교. 길이가 다르면 timingSafeEqual 이 던지므로 둘 다 해시로 맞춘 뒤 비교한다 —
 * 길이를 먼저 견주면 그 자체가 비밀번호 길이를 흘린다.
 */
function matches(provided: string | null, expected: string): boolean {
  if (provided === null) return false;
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

let warned = false;

/** 키는 있는데 비밀번호가 없는 조합 — 공개 배포라면 백엔드를 그대로 열어 둔 것이다. 한 번만 말한다. */
function warnIfTheKeyIsUnguarded() {
  if (warned || !process.env.KOTONA_API_KEY) return;
  warned = true;
  console.warn(
    "KOTONA_API_KEY 는 설정됐는데 KOTONA_SITE_PASSWORD 가 없습니다. 이 사이트에 닿는 누구나 " +
      "백엔드를 키를 가진 채로 부를 수 있습니다. 공개 배포라면 KOTONA_SITE_PASSWORD 를 설정하세요.",
  );
}
