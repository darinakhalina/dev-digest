import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Toggle } from "./Toggle";

afterEach(cleanup);

describe("Toggle — SPEC-2026-09-25-accessibility", () => {
  it("exposes the label a caller gives it as its accessible name", () => {
    render(<Toggle on={false} onChange={vi.fn()} label="Enabled" />);
    expect(screen.getByRole("switch", { name: "Enabled" })).toBeInTheDocument();
  });
});
