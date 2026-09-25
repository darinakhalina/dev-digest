import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReviewRecord } from "@devdigest/shared";
import prReview from "../../../../../../../../messages/en/prReview.json";
import runs from "../../../../../../../../messages/en/runs.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useDeleteReview: () => ({ mutate: vi.fn(), isPending: false }),
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { ReviewRunAccordion } from "./ReviewRunAccordion";

afterEach(cleanup);

const REVIEW: ReviewRecord = {
  id: "r1",
  pr_id: "pr1",
  run_id: "run1",
  agent_id: "a1",
  agent_name: "Security",
  kind: "review",
  verdict: "comment",
  summary: "s",
  score: 80,
  model: "gpt-4.1",
  created_at: "2026-09-21T10:00:00.000Z",
  findings: [],
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview, runs }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ReviewRunAccordion verdict — SPEC-2026-09-25-lib-modules", () => {
  it("colours the header verdict badge the same as the VerdictBanner it wraps", () => {
    renderWithIntl(<ReviewRunAccordion review={REVIEW} prId="pr1" defaultOpen />);
    const badges = screen.getAllByText(/comment/i);
    for (const b of badges) expect(b).toHaveStyle({ color: "var(--info)" });
  });
});
