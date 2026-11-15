import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 테스트마다 DOM 을 비운다
afterEach(cleanup);
