import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // vitest 가 남기는 HTML 커버리지 리포트. 우리가 쓴 코드가 아닌데, 그 안의
    // eslint-disable 주석 때문에 "쓸모없는 disable" 경고가 떴다.
    "coverage/**",
  ]),
]);

export default eslintConfig;
