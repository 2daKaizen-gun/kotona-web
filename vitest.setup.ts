import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 테스트마다 DOM 을 비운다. 안 그러면 앞 테스트가 그린 화면이 남아
// getByText 가 엉뚱한 노드를 집는다.
afterEach(cleanup);
