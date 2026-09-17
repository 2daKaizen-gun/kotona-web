import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import DemoBanner from "@/components/DemoBanner";
import ProgressIndicator from "@/components/ProgressIndicator";
import SiteNav from "@/components/SiteNav";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("DemoBanner", () => {
  /**
   * 배포된 사이트가 기만이 아니게 만드는 유일한 장치다.
   * 문구가 흐려지거나 빠지면 지어낸 분석을 진짜처럼 보여 주게 된다.
   */
  it("예시 데이터라는 것을 분명히 말한다", () => {
    render(<DemoBanner />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("예시 모드");
    expect(banner).toHaveTextContent("샘플");
    expect(banner).toHaveTextContent("실제 AI 분석이 아니며");
  });

  it("입력이 저장되지 않는다고 알린다", () => {
    // 쓰기를 거절하므로, 사용자가 저장된 줄 알고 떠나지 않게 미리 말한다
    render(<DemoBanner />);

    expect(screen.getByRole("status")).toHaveTextContent("저장되지 않습니다");
  });

  it("이유를 볼 수 있는 곳으로 연결한다", () => {
    render(<DemoBanner />);

    const link = screen.getByRole("link", { name: "왜인가요?" });
    expect(link).toHaveAttribute("href", expect.stringContaining("kotona-analyzer"));
    // 새 탭으로 열 때 원래 창을 조작하지 못하게 한다
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });
});

describe("SiteNav", () => {
  afterEach(() => {
    pathname.current = "/";
  });

  it("세 페이지로 가는 링크가 있다", () => {
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "분석" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "이력" })).toHaveAttribute("href", "/history");
    expect(screen.getByRole("link", { name: "사전" })).toHaveAttribute("href", "/phrases");
  });

  it("지금 페이지를 보조기술에 알린다", () => {
    pathname.current = "/history";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "이력" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "사전" })).not.toHaveAttribute("aria-current");
  });

  it("다른 페이지에 있을 때 분석 링크를 활성으로 표시하지 않는다", () => {
    // "/" 는 모든 경로의 접두사다. startsWith 로 비교하면 늘 활성이 된다.
    pathname.current = "/phrases";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "분석" })).not.toHaveAttribute("aria-current");
  });

  it("하위 경로에서도 상위 메뉴를 활성으로 본다", () => {
    pathname.current = "/history/42";
    render(<SiteNav />);

    expect(screen.getByRole("link", { name: "이력" })).toHaveAttribute("aria-current", "page");
  });
});

describe("ProgressIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** 경과 시간을 흘려보내고 화면을 갱신한다. */
  function advance(seconds: number) {
    act(() => {
      vi.advanceTimersByTime(seconds * 1000);
    });
  }

  it("처음에는 첫 단계에 있다", () => {
    render(<ProgressIndicator />);

    expect(screen.getByText("0초")).toBeInTheDocument();
  });

  it("시간이 지나면 경과 초가 올라간다", () => {
    // 이게 멈춰 있으면 화면이 얼어붙은 것처럼 보인다 — 이 컴포넌트가 있는 이유다
    render(<ProgressIndicator />);

    advance(5);

    expect(screen.getByText("5초")).toBeInTheDocument();
  });

  it("단계가 시간에 따라 넘어가고 지난 단계는 완료로 표시된다", () => {
    render(<ProgressIndicator />);

    advance(11);

    // 10초를 넘기면 앞의 두 단계는 끝난 것으로 보인다
    expect(screen.getAllByText("✓")).toHaveLength(2);
  });

  it("마지막 단계에서 멈추고 더 넘어가지 않는다", () => {
    // 응답이 79초까지 걸린 적이 있다. 단계가 바닥나도 화면이 깨지면 안 된다.
    render(<ProgressIndicator />);

    advance(90);

    expect(screen.getByText("90초")).toBeInTheDocument();
    expect(screen.getAllByText("✓")).toHaveLength(3);
  });

  it("사라지면 타이머를 정리한다", () => {
    // 정리하지 않으면 결과가 뜬 뒤에도 백그라운드에서 계속 돈다
    const { unmount } = render(<ProgressIndicator />);
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
