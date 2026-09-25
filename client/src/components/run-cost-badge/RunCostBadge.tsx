"use client";

import React from "react";
import { formatCost, isKnownCost } from "@/lib/cost";
import { formatExactTokenCount } from "@/lib/tokens";

type Props =
  | { variant: "compact"; cost: number | null | undefined }
  | {
      variant: "withTokens";
      cost: number | null | undefined;
      tokensIn: number | null | undefined;
      tokensOut: number | null | undefined;
    };

const numeric: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const muted: React.CSSProperties = { ...numeric, color: "var(--text-muted)" };

export function RunCostBadge(props: Props) {
  const priced = isKnownCost(props.cost);
  const style = priced ? numeric : muted;

  if (props.variant === "compact") {
    return <span style={style}>{formatCost(props.cost)}</span>;
  }

  const totalTokens = (props.tokensIn ?? 0) + (props.tokensOut ?? 0);
  if (totalTokens === 0 && !priced) return <span style={muted}>—</span>;

  return (
    <span style={style}>
      {formatExactTokenCount(totalTokens)} tok · {formatCost(props.cost)}
    </span>
  );
}
