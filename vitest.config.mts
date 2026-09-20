import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig 의 "@/*" 별칭을 vitest 도 알아야 한다.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // 컴포넌트 테스트는 DOM 이 필요하다. 순수 함수 테스트도 같이 돌아간다.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // e2e/ 는 Playwright 가 돌린다. 둘이 같은 파일을 집으면 서로의 API 로 실행되다 깨진다.
    exclude: ["e2e/**", "node_modules/**"],

    /*
     * 커버리지. 처음 재 봤을 때 라인 79.7% 였는데, 합계보다 어디가 비었는지가 문제였다 —
     * 사전 화면이 60% 였고 그 안에 수정·삭제·더 보기가 통째로 들어 있었다.
     * 백엔드가 JaCoCo 로 하는 일을 여기서도 한다.
     */
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/types/**", // 백엔드 스펙에서 생성된 파일
        "src/**/__tests__/**",
        /*
         * app/ 의 page·layout 은 서버 컴포넌트다. jsdom 에서는 의미 있게 실행할 수 없고,
         * 하는 일도 클라이언트 컴포넌트를 배치하는 것뿐이다. 이 파일들이 실제로 도는지는
         * 브라우저 테스트 12개가 매번 확인한다.
         */
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
      ],
      reporter: ["text-summary", "json-summary", "html"],
      /*
       * 바닥선은 지금 수치보다 조금 낮게 둔다. 작은 리팩터링을 막자는 게 아니라,
       * 테스트 없는 기능이 통째로 들어오는 것을 막자는 것이다.
       */
      thresholds: {
        lines: 90,
        branches: 82,
        functions: 85,
        statements: 90,
      },
    },
  },
});
