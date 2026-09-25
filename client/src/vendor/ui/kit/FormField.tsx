import React from "react";

export function FormField({
  label,
  hint,
  required,
  children,
  right,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const generatedId = React.useId();
  const fieldId = React.isValidElement(children) ? (children.props as { id?: string }).id ?? generatedId : generatedId;
  const associated =
    React.isValidElement(children) && typeof label !== "undefined"
      ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id: fieldId })
      : children;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <label
          htmlFor={typeof label !== "undefined" ? fieldId : undefined}
          style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}
        >
          {label}
          {required && <span style={{ color: "var(--crit)", marginLeft: 4 }}>*</span>}
        </label>
        {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
      </div>
      {associated}
      {hint && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.45 }}>{hint}</div>
      )}
    </div>
  );
}
