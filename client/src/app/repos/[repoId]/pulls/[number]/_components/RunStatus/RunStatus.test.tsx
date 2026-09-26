import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/en/prReview.json";

const state = vi.hoisted(() => ({ running: false }));
vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useRunEvents: () => ({ events: [], running: state.running }),
}));

import { RunStatus } from "./RunStatus";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("RunStatus (smoke)", () => {
  it("renders nothing when there are no run ids", () => {
    const { container } = renderWithIntl(<RunStatus runIds={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("RunStatus onDone — SPEC-2026-09-25-pr-page-bugs", () => {
  it("fires once when the runs settle, however often the parent re-renders", () => {
    const onDone = vi.fn();
    state.running = true;
    const { rerender } = renderWithIntl(<RunStatus runIds={["r1"]} onDone={() => onDone()} />);
    state.running = false;
    const again = () =>
      rerender(
        <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
          <RunStatus runIds={["r1"]} onDone={() => onDone()} />
        </NextIntlClientProvider>,
      );
    again();
    again();
    again();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
