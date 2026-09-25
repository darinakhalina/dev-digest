import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Drawer } from "./Drawer";

afterEach(cleanup);

describe("Drawer keyboard — SPEC-2026-09-25-accessibility", () => {
  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Drawer title="Trace" onClose={onClose}>
        <div>body</div>
      </Drawer>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the dialog on open and restores it on close", () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <>
          <button>trigger</button>
          {open && (
            <Drawer title="Trace">
              <div>body</div>
            </Drawer>
          )}
        </>
      );
    }
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(<Harness open />);
    expect(screen.getByRole("dialog")).toHaveFocus();

    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });
});
