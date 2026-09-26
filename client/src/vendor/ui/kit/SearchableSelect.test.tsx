import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SearchableSelect } from "./SearchableSelect";

afterEach(cleanup);

describe("SearchableSelect keyboard — SPEC-2026-09-25-accessibility", () => {
  it("trigger is a real, focusable button that opens the list on click", () => {
    render(<SearchableSelect value="gpt-4" options={["gpt-4", "gpt-5"]} />);
    const trigger = screen.getByRole("button", { name: /gpt-4/ });

    expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });
});
