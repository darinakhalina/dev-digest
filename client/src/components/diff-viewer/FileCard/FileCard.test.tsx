import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrFile } from "@/lib/types";
import shellMessages from "../../../../messages/en/shell.json";
import { FileCard } from "./FileCard";

afterEach(cleanup);

const BIG_FILE: PrFile = {
  path: "src/big-file.ts",
  additions: 500,
  deletions: 500,
  patch: "@@ -1,1 +1,1 @@\n-old\n+new",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ shell: shellMessages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FileCard keyboard — SPEC-2026-09-25-accessibility", () => {
  it("is reachable and expandable by keyboard", () => {
    renderWithIntl(<FileCard file={BIG_FILE} />);
    const header = screen.getByRole("button", { name: /big-file\.ts/ });
    expect(header).toHaveAttribute("aria-expanded", "false");

    header.focus();
    fireEvent.keyDown(header, { key: "Enter" });

    expect(header).toHaveAttribute("aria-expanded", "true");
  });
});
