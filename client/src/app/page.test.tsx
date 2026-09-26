import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import shellMessages from "../../messages/en/shell.json";

const state = vi.hoisted(() => ({ isLoading: false, isError: false, data: undefined as unknown }));
vi.mock("../lib/hooks", () => ({
  useRepos: () => ({ isLoading: state.isLoading, isError: state.isError, data: state.data }),
  usePulls: () => ({ data: undefined }),
  useDeleteRepo: () => ({ mutate: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));

import HomePage from "./page";

afterEach(cleanup);

function renderHome() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ shell: shellMessages }}>
      <HomePage />
    </NextIntlClientProvider>,
  );
}

describe("HomePage — SPEC-2026-09-25-pr-page-bugs", () => {
  it("shows an error state when the engine is unreachable, not the empty-install state", () => {
    state.isLoading = false;
    state.isError = true;
    state.data = undefined;
    renderHome();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("No repositories yet")).not.toBeInTheDocument();
  });

  it("shows the empty-install state when there really are no repositories", () => {
    state.isLoading = false;
    state.isError = false;
    state.data = [];
    renderHome();
    expect(screen.getByText("No repositories yet")).toBeInTheDocument();
  });
});
