type Mode = "none" | "fixed" | "percent";

export type PercentRow = {
  mode: Mode;
  percent?: string;
};

const toNumber = (value?: string) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const normalizePercentRows = <T extends PercentRow>(rows: T[]): T[] => {
  const percentRows = rows.filter((row) => row.mode === "percent");
  const total = percentRows.reduce((sum, row) => sum + toNumber(row.percent), 0);
  if (total <= 0 || percentRows.length === 0) return rows;

  const updated = [...rows];
  const lastIndex = percentRows.length - 1;
  let running = 0;

  percentRows.forEach((row, index) => {
    const original = toNumber(row.percent);
    const next =
      index === lastIndex
        ? round2(100 - running)
        : round2((original / total) * 100);
    running = round2(running + next);
    const rowIndex = updated.indexOf(row);
    updated[rowIndex] = { ...row, percent: next.toFixed(2) };
  });

  return updated;
};
