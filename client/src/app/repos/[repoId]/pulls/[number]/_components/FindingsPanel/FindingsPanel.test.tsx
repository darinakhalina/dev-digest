import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useFindingAction: () => ({ mutate, isPending: false }),
}));

import { FindingsPanel } from "./FindingsPanel";

afterEach(() => {
  cleanup();
  mutate.mockClear();
});

const FINDINGS: FindingRecord[] = [
  {
    id: "f1",
    severity: "CRITICAL",
    category: "security",
    title: "Hardcoded secret",
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    rationale: "A secret is committed.",
    suggestion: null,
    confidence: 0.95,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FindingsPanel (smoke)", () => {
  it("renders the toolbar + a finding card", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    expect(screen.getByText("Hide low confidence")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded secret")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });
});

const MANY: FindingRecord[] = [
  { ...FINDINGS[0]!, id: "c1", severity: "CRITICAL", title: "Crit one" },
  { ...FINDINGS[0]!, id: "w1", severity: "WARNING", title: "Warn one" },
  { ...FINDINGS[0]!, id: "w2", severity: "WARNING", title: "Warn two" },
];

const LOW_CRIT: FindingRecord[] = [
  { ...FINDINGS[0]!, id: "lc", severity: "CRITICAL", title: "Low crit", confidence: 0.2 },
  { ...FINDINGS[0]!, id: "hw", severity: "WARNING", title: "High warn", confidence: 0.9 },
];

describe("severity counters and filter", () => {
  it("shows a counter per present level and none for an absent one (AC-1, AC-2)", () => {
    renderWithIntl(<FindingsPanel findings={MANY} prId="pr1" />);
    const counters = screen.getByTestId("severity-counters");
    expect(within(counters).getByText("Critical")).toBeInTheDocument();
    expect(within(counters).getByText("Warning")).toBeInTheDocument();
    expect(within(counters).queryByText("Suggestion")).not.toBeInTheDocument();
  });

  it("the number equals the cards listed below (AC-5)", () => {
    renderWithIntl(<FindingsPanel findings={MANY} prId="pr1" />);
    const counters = screen.getByTestId("severity-counters");
    expect(within(counters).getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Warn one")).toBeInTheDocument();
    expect(screen.getByText("Warn two")).toBeInTheDocument();
  });

  it("offers a button only for a level the run produced (AC-8)", () => {
    renderWithIntl(<FindingsPanel findings={MANY} prId="pr1" />);
    expect(screen.queryByRole("button", { name: /suggestion/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /critical/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /warning/i })).toBeInTheDocument();
  });

  it("filters, unions and clears (AC-10, AC-11, AC-12, AC-13)", () => {
    renderWithIntl(<FindingsPanel findings={MANY} prId="pr1" />);
    fireEvent.click(screen.getByRole("button", { name: /critical/i }));
    expect(screen.queryByText("Warn one")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /warning/i }));
    expect(screen.getByText("Crit one")).toBeInTheDocument();
    expect(screen.getByText("Warn one")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /critical/i }));
    expect(screen.queryByText("Crit one")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /warning/i }));
    expect(screen.getByText("Crit one")).toBeInTheDocument();
  });

  it("marks the active button pressed (AC-16)", () => {
    renderWithIntl(<FindingsPanel findings={MANY} prId="pr1" />);
    const crit = screen.getByRole("button", { name: /critical/i });
    expect(crit).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(crit);
    expect(crit).toHaveAttribute("aria-pressed", "true");
  });

  it("counts only what the confidence control admits (AC-6)", () => {
    renderWithIntl(<FindingsPanel findings={LOW_CRIT} prId="pr1" />);
    expect(within(screen.getByTestId("severity-counters")).getByText("Critical")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch"));

    const counters = screen.getByTestId("severity-counters");
    expect(within(counters).queryByText("Critical")).not.toBeInTheDocument();
    expect(within(counters).getByText("Warning")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /critical/i })).not.toBeInTheDocument();
  });

  it("an active button survives its count falling to zero (AC-9)", () => {
    renderWithIntl(<FindingsPanel findings={LOW_CRIT} prId="pr1" />);
    const critButton = () => screen.getByRole("button", { name: /critical/i });
    fireEvent.click(critButton());
    fireEvent.click(screen.getByRole("switch"));

    expect(within(screen.getByTestId("severity-counters")).queryByText("Critical")).not.toBeInTheDocument();
    expect(critButton()).toBeInTheDocument();

    fireEvent.click(critButton());

    expect(screen.queryByRole("button", { name: /critical/i })).not.toBeInTheDocument();
    expect(screen.getByText("High warn")).toBeInTheDocument();
  });

  it("keeps the buttons visible when the narrowing empties the list (AC-14)", () => {
    renderWithIntl(<FindingsPanel findings={LOW_CRIT} prId="pr1" />);
    fireEvent.click(screen.getByRole("button", { name: /critical/i }));
    expect(screen.getByText("Low crit")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch"));

    expect(screen.getByText("No findings match")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /warning/i })).toBeInTheDocument();
  });
});

describe("FindingsPanel keyboard shortcuts — SPEC-2026-09-25-pr-page-bugs", () => {
  const LIST: FindingRecord[] = [
    { ...FINDINGS[0]!, id: "k1", title: "First" },
    { ...FINDINGS[0]!, id: "k2", title: "Second" },
    { ...FINDINGS[0]!, id: "k3", title: "Third" },
  ];

  it("ignores a shortcut pressed outside the list", () => {
    renderWithIntl(<FindingsPanel findings={LIST} prId="pr1" />);
    fireEvent.keyDown(document.body, { key: "a" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("accepts the current finding when a is pressed in the list", () => {
    renderWithIntl(<FindingsPanel findings={LIST} prId="pr1" />);
    fireEvent.keyDown(screen.getByRole("list"), { key: "a" });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toMatchObject({ findingId: "k1", action: "accept" });
  });

  it("ignores a shortcut held with a modifier", () => {
    renderWithIntl(<FindingsPanel findings={LIST} prId="pr1" />);
    const list = screen.getByRole("list");
    fireEvent.keyDown(list, { key: "a", metaKey: true });
    fireEvent.keyDown(list, { key: "a", ctrlKey: true });
    fireEvent.keyDown(list, { key: "d", altKey: true });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("acts on the card the pointer chose", () => {
    renderWithIntl(<FindingsPanel findings={LIST} prId="pr1" />);
    fireEvent.click(screen.getByText("Third"));
    fireEvent.keyDown(screen.getByRole("list"), { key: "d" });
    expect(mutate.mock.calls[0]![0]).toMatchObject({ findingId: "k3", action: "dismiss" });
  });

  it("acts only in the panel the key was pressed in", () => {
    renderWithIntl(
      <>
        <FindingsPanel findings={[LIST[0]!]} prId="pr1" />
        <FindingsPanel findings={[LIST[1]!]} prId="pr1" />
      </>,
    );
    fireEvent.keyDown(screen.getAllByRole("list")[1]!, { key: "a" });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toMatchObject({ findingId: "k2" });
  });

  it("does not let the shell see a shortcut it handled", () => {
    const shell = vi.fn();
    window.addEventListener("keydown", shell);
    renderWithIntl(<FindingsPanel findings={LIST} prId="pr1" />);
    fireEvent.keyDown(screen.getByRole("list"), { key: "a" });
    window.removeEventListener("keydown", shell);
    expect(shell).not.toHaveBeenCalled();
  });
});
