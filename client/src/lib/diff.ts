export type DiffKind = "same" | "added" | "removed";

export interface DiffRow {
  kind: DiffKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface DiffCounts {
  added: number;
  removed: number;
}

export function diffLines(before: string, after: string): DiffRow[] {
  const a = before.split("\n");
  const b = after.split("\n");

  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ kind: "same", text: a[i]!, oldLine: i + 1, newLine: j + 1 });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      rows.push({ kind: "removed", text: a[i]!, oldLine: i + 1, newLine: null });
      i++;
    } else {
      rows.push({ kind: "added", text: b[j]!, oldLine: null, newLine: j + 1 });
      j++;
    }
  }
  while (i < a.length) {
    rows.push({ kind: "removed", text: a[i]!, oldLine: i + 1, newLine: null });
    i++;
  }
  while (j < b.length) {
    rows.push({ kind: "added", text: b[j]!, oldLine: null, newLine: j + 1 });
    j++;
  }

  return rows;
}

export function countChanges(rows: DiffRow[]): DiffCounts {
  let added = 0;
  let removed = 0;
  for (const r of rows) {
    if (r.kind === "added") added++;
    else if (r.kind === "removed") removed++;
  }
  return { added, removed };
}

export function collapseUnchanged(rows: DiffRow[], context = 3): DiffRow[][] {
  const keep = new Array<boolean>(rows.length).fill(false);
  rows.forEach((r, idx) => {
    if (r.kind === "same") return;
    for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) {
      keep[k] = true;
    }
  });

  const hunks: DiffRow[][] = [];
  let current: DiffRow[] = [];
  rows.forEach((r, idx) => {
    if (keep[idx]) {
      current.push(r);
    } else if (current.length > 0) {
      hunks.push(current);
      current = [];
    }
  });
  if (current.length > 0) hunks.push(current);
  return hunks;
}
