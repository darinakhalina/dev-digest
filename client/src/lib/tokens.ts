export function formatTokenCount(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  const m = n / 1_000_000;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m)}M`;
}

export function formatTokenRange(tokensIn: number, tokensOut: number): string {
  return `${formatTokenCount(tokensIn)}→${formatTokenCount(tokensOut)}`;
}

export function formatExactTokenCount(n: number): string {
  return n.toLocaleString("en-US");
}
