import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ToolCall } from "@devdigest/shared";
import runs from "../../../../../../../../../../messages/en/runs.json";
import { ToolCallRow } from "./ToolCallRow";

afterEach(cleanup);

const TC: ToolCall = { tool: "review_file", args: "src/a.ts", meta: "ok", ms: 12 };

function renderWithIntl(ui: React.ReactElement) {
  return render(<NextIntlClientProvider locale="en" messages={{ runs }}>{ui}</NextIntlClientProvider>);
}

describe("ToolCallRow keyboard — SPEC-2026-09-25-accessibility", () => {
  it("is reachable and toggleable by keyboard", () => {
    renderWithIntl(<ToolCallRow tc={TC} />);
    const header = screen.getByRole("button", { name: /review_file/ });
    expect(header).toHaveAttribute("aria-expanded", "false");

    header.focus();
    fireEvent.keyDown(header, { key: "Enter" });

    expect(header).toHaveAttribute("aria-expanded", "true");
  });
});
