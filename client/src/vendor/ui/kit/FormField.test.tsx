import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FormField } from "./FormField";
import { TextInput } from "./TextInput";
import { SelectInput } from "./SelectInput";
import { Textarea } from "./Textarea";

afterEach(cleanup);

describe("FormField — SPEC-2026-09-25-accessibility", () => {
  it("associates its label with a TextInput child, so the field is reachable by its label", () => {
    render(
      <FormField label="Name">
        <TextInput value="" onChange={() => undefined} />
      </FormField>,
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("associates its label with a SelectInput child", () => {
    render(
      <FormField label="Provider">
        <SelectInput value="a" onChange={() => undefined} options={["a", "b"]} />
      </FormField>,
    );
    expect(screen.getByLabelText("Provider")).toBeInTheDocument();
  });

  it("associates its label with a Textarea child", () => {
    render(
      <FormField label="Prompt">
        <Textarea value="" onChange={() => undefined} />
      </FormField>,
    );
    expect(screen.getByLabelText("Prompt")).toBeInTheDocument();
  });
});
