import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord } from "@devdigest/shared";
import messages from "../../../../../../../../../../messages/en/runs.json";
import { FindingsSection } from "./FindingsSection";

afterEach(cleanup);

const FINDING: FindingRecord = {
  id: "f1",
  severity: "SUGGESTION",
  category: "style",
  title: "Consider renaming",
  file: "a.ts",
  start_line: 1,
  end_line: 1,
  rationale: "r",
  suggestion: null,
  confidence: 0.5,
  kind: "finding",
  trifecta_components: null,
  evidence: null,
  review_id: "r1",
  accepted_at: null,
  dismissed_at: null,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ runs: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FindingsSection severity colour — SPEC-2026-09-25-lib-modules", () => {
  it("colours a SUGGESTION finding the same as everywhere else it appears", () => {
    renderWithIntl(<FindingsSection findings={[FINDING]} />);
    const badge = screen.getByText("Suggestion");
    expect(badge).toHaveStyle({ color: "var(--sugg)" });
  });
});
