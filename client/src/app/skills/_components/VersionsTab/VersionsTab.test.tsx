import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Skill, SkillVersion } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";
import { VersionsTab } from "./VersionsTab";

const versions = vi.hoisted(() => vi.fn());
const restore = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/skills", () => ({
  useSkillVersions: (id: string) => versions(id),
  useRestoreSkillVersion: () => restore(),
}));

vi.mock("@/lib/toast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const skill = (over: Partial<Skill> = {}): Skill => ({
  id: "s1",
  name: "breaking-change",
  description: "d",
  type: "custom",
  source: "manual",
  body: "line one\nline two\n",
  enabled: true,
  version: 2,
  evidence_files: null,
  agent_count: 1,
  threat_level: "safe",
  threat_signals: [],
  ...over,
});

const version = (v: number, body: string): SkillVersion => ({
  skill_id: "s1",
  version: v,
  body,
  created_at: "2026-09-27T10:00:00.000Z",
});

function renderTab(skillOverride: Partial<Skill> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
        <VersionsTab skill={skill(skillOverride)} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  restore.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

describe("VersionsTab", () => {
  it("shows what changed between the newest version and the one before it", async () => {
    versions.mockReturnValue({
      data: [version(1, "line one\n"), version(2, "line one\nline two\n")],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderTab();

    await waitFor(() => expect(screen.getByText("v1")).toBeTruthy());
    expect(screen.getByText("v2")).toBeTruthy();
    expect(screen.getByText("+1")).toBeTruthy();
    expect(screen.getByText("−0")).toBeTruthy();
  });

  it("says there is nothing to compare for the very first version", async () => {
    versions.mockReturnValue({
      data: [version(1, "only one\n")],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderTab({ version: 1 });

    await waitFor(() => expect(screen.getByText(/the first one/i)).toBeTruthy());
  });

  it("offers no restore for the version that is already current", async () => {
    versions.mockReturnValue({
      data: [version(2, "line one\nline two\n")],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderTab({ version: 2 });

    await waitFor(() => expect(screen.getByText("v2")).toBeTruthy());
    expect(screen.queryByRole("button", { name: /restore/i })).toBeNull();
  });

  it("reports an empty history rather than rendering nothing", async () => {
    versions.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    renderTab();

    await waitFor(() => expect(screen.getByText(/no versions yet/i)).toBeTruthy());
  });
});
