import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // tsconfig 의 "@/*" 별칭을 vitest 도 알아야 한다.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // 지금 테스트는 전부 순수 함수라 DOM 이 필요 없다.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
