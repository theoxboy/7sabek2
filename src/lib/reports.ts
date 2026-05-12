import type { CategoryEnvelopeMapOut, CategoryOut, EnvelopeOut, TransactionOut } from "@/lib/types";

export type DateRange = {
  start: string;
  end: string;
};

export type DailyBucket = {
  date: string;
  income: number;
  expense: number;
  net: number;
};

export type HeatmapCell = {
  date: string;
  value: number;
};

export type FilterState = {
  start: string;
  end: string;
  type: "all" | "income" | "expense";
  categoryId: string | "all";
  envelopeId: string | "all";
  mappedOnly: boolean;
};

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatMoney = (value: string | number, currency: string) => {
  const numeric = toNumber(value);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return numeric.toFixed(2);
  }
};

export const startOfYear = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getFullYear(), 0, 1).toISOString().slice(0, 10);
};

export const addDays = (iso: string, delta: number) => {
  const date = new Date(iso);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
};

export const daysBetween = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export type TransactionWithEnvelope = TransactionOut & {
  envelopeId?: string | null;
  isMappedExpense?: boolean;
};

export const attachEnvelopeIds = (
  transactions: TransactionOut[],
  categories: CategoryOut[],
  envelopes: EnvelopeOut[],
  mappings: CategoryEnvelopeMapOut[]
): TransactionWithEnvelope[] => {
  const mappingByCategory = new Map(
    mappings.map((mapping) => [mapping.category_id, mapping.envelope_id])
  );
  const categorySet = new Set(categories.map((category) => category.id));
  const cashEnvelope = envelopes.find((envelope) => envelope.is_cash);

  return transactions.map((transaction) => {
    const isExpense = transaction.type === "expense";
    const categoryKnown = categorySet.has(transaction.category_id);
    let envelopeId: string | null = null;

    if (transaction.type === "income") {
      envelopeId = cashEnvelope?.id ?? null;
    } else if (isExpense && categoryKnown) {
      envelopeId = mappingByCategory.get(transaction.category_id) ?? null;
    }

    return {
      ...transaction,
      envelopeId,
      isMappedExpense: isExpense && envelopeId !== null,
    };
  });
};

export const filterTransactions = (
  transactions: TransactionWithEnvelope[],
  filters: FilterState
) => {
  const start = new Date(filters.start);
  const end = new Date(filters.end);

  return transactions.filter((tx) => {
    const occurred = new Date(tx.occurred_on);
    if (occurred < start || occurred > end) return false;
    if (filters.type !== "all" && tx.type !== filters.type) return false;
    if (filters.categoryId !== "all" && tx.category_id !== filters.categoryId) {
      return false;
    }
    if (filters.envelopeId !== "all") {
      if (tx.envelopeId !== filters.envelopeId) return false;
    }
    if (filters.mappedOnly && tx.type === "expense") {
      return Boolean(tx.envelopeId);
    }
    return true;
  });
};

export const groupByDay = (transactions: TransactionWithEnvelope[]): DailyBucket[] => {
  const map = new Map<string, { income: number; expense: number }>();

  transactions.forEach((tx) => {
    const key = tx.occurred_on;
    const current = map.get(key) ?? { income: 0, expense: 0 };
    const amount = toNumber(tx.amount);

    if (tx.type === "income") {
      current.income += amount;
    } else {
      current.expense += amount;
    }
    map.set(key, current);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, value]) => ({
      date,
      income: value.income,
      expense: value.expense,
      net: value.income - value.expense,
    }));
};

export const cumulativeSeries = (values: number[]) => {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
};

export const movingAverage = (values: number[], window: number) => {
  if (values.length === 0) return [];
  return values.map((_, idx) => {
    const start = Math.max(0, idx - window + 1);
    const slice = values.slice(start, idx + 1);
    const sum = slice.reduce((acc, value) => acc + value, 0);
    return sum / slice.length;
  });
};

export const buildHeatmap = (
  transactions: TransactionWithEnvelope[],
  range: DateRange
): HeatmapCell[] => {
  const dayMap = new Map<string, number>();
  const start = new Date(range.start);
  const end = new Date(range.end);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dayMap.set(date.toISOString().slice(0, 10), 0);
  }

  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const current = dayMap.get(tx.occurred_on) ?? 0;
      dayMap.set(tx.occurred_on, current + toNumber(tx.amount));
    });

  return Array.from(dayMap.entries()).map(([date, value]) => ({ date, value }));
};

export const intensityClass = (value: number, max: number) => {
  if (max <= 0) return "bg-[var(--surface-2)]";
  const ratio = value / max;
  if (ratio > 0.8) return "bg-[var(--accent)]";
  if (ratio > 0.6) return "bg-[var(--accent-strong)]";
  if (ratio > 0.4) return "bg-[var(--accent-soft)]";
  if (ratio > 0.2) return "bg-[var(--surface-2)]";
  return "bg-[var(--surface-2)]/60";
};

export const deriveInsights = (data: {
  totalIncome: number;
  totalExpense: number;
  topEnvelope?: { name: string; total: number };
  unmappedRatio: number;
  busiestDay?: { date: string; total: number };
  savingsChange?: number;
  sweepDue?: boolean;
}) => {
  const insights: string[] = [];
  if (data.totalExpense > data.totalIncome) {
    insights.push("Spending exceeded income in the selected period.");
  } else {
    insights.push("Income covered spending for the selected period.");
  }

  if (data.topEnvelope) {
    insights.push(
      `Top envelope spend: ${data.topEnvelope.name} (${data.topEnvelope.total.toFixed(2)}).`
    );
  }

  insights.push(
    `Unmapped expenses represent ${(data.unmappedRatio * 100).toFixed(1)}% of spend.`
  );

  if (data.busiestDay) {
    insights.push(
      `Highest spending day was ${data.busiestDay.date} (${data.busiestDay.total.toFixed(2)}).`
    );
  }

  if (typeof data.savingsChange === "number") {
    insights.push(
      data.savingsChange >= 0
        ? `Savings grew by ${data.savingsChange.toFixed(2)} this period.`
        : `Savings declined by ${Math.abs(data.savingsChange).toFixed(2)} this period.`
    );
  }

  if (data.sweepDue) {
    insights.push("A sweep is due. Run it to keep envelopes aligned.");
  }

  if (data.totalExpense > 0) {
    const burnRate = (data.totalExpense / 30).toFixed(2);
    insights.push(`Daily burn rate averages ${burnRate}.`);
  }

  return insights.slice(0, 10);
};
