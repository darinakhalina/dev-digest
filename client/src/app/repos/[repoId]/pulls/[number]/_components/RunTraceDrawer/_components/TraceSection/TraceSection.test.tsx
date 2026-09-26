import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TraceSection } from "./TraceSection";

afterEach(cleanup);

describe("TraceSection keyboard — SPEC-2026-09-25-accessibility", () => {
  it("is reachable and toggleable by keyboard", () => {
    render(
      <TraceSection icon="Settings" title="Config" defaultOpen={false}>
        <div>body</div>
      </TraceSection>,
    );
    const header = screen.getByRole("button", { name: /Config/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("body")).not.toBeInTheDocument();

    header.focus();
    fireEvent.keyDown(header, { key: "Enter" });

    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
