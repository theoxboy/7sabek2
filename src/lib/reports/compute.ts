import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  EnvelopeOut,
  TransactionOut,
} from "@/lib/types";

export type FilterState = {
  start: string;
  end: string;
  type: "all" | "income" | "expense";
  categoryId: string | "all";
  envelopeId: string | "all";
  mappedOnly: boolean;
};

export type TransactionWithEnvelope = TransactionOut & {
  envelopeId?: string | null;
  isMappedExpense?: boolean;
};

export type DailyBucket = {
  date: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  avgSize: number;
};

export type EnvelopeSpend = {
  envelopeId: string;
  name: string;
  total: number;
};

export type CategorySpend = {
  categoryId: string;
  name: string;
  total: number;
};

export type KpiBundle = {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  transactionCount: number;
  unmappedSpend: number;
  mappedRatio: number;
  lastActivity?: string;
  mappedCategories: number;
  totalCategories: number;
  allocatedEnvelopes: number;
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
  const map = new Map<string, { income: number; expense: number; count: number; sum: number }>();

  transactions.forEach((tx) => {
    const key = tx.occurred_on;
    const current = map.get(key) ?? {
      income: 0,
      expense: 0,
      count: 0,
      sum: 0,
    };
    const amount = toNumber(tx.amount);

    if (tx.type === "income") {
      current.income += amount;
    } else {
      current.expense += amount;
    }
    current.count += 1;
    current.sum += amount;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, value]) => ({
      date,
      income: value.income,
      expense: value.expense,
      net: value.income - value.expense,
      count: value.count,
      avgSize: value.count ? value.sum / value.count : 0,
    }));
};

export const cumulativeSeries = (values: number[]) => {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
};

export const groupByEnvelopeFromMappings = (
  transactions: TransactionWithEnvelope[],
  envelopes: EnvelopeOut[]
): EnvelopeSpend[] => {
  const map = new Map<string, EnvelopeSpend>();
  const envelopeName = new Map(envelopes.map((env) => [env.id, env.name]));

  transactions
    .filter((tx) => tx.type === "expense" && tx.envelopeId)
    .forEach((tx) => {
      const id = tx.envelopeId ?? "";
      const current = map.get(id) ?? {
        envelopeId: id,
        name: envelopeName.get(id) ?? "Unknown",
        total: 0,
      };
      current.total += toNumber(tx.amount);
      map.set(id, current);
    });

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
};

export const groupByCategory = (
  transactions: TransactionWithEnvelope[],
  categories: CategoryOut[]
): CategorySpend[] => {
  const map = new Map<string, CategorySpend>();
  const names = new Map(categories.map((category) => [category.id, category.name]));

  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const current = map.get(tx.category_id) ?? {
        categoryId: tx.category_id,
        name: names.get(tx.category_id) ?? "Unknown",
        total: 0,
      };
      current.total += toNumber(tx.amount);
      map.set(tx.category_id, current);
    });

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
};

export const buildKpis = (
  transactions: TransactionWithEnvelope[],
  categories: CategoryOut[],
  mappings: CategoryEnvelopeMapOut[],
  allocatedEnvelopeIds: string[]
): KpiBundle => {
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + toNumber(tx.amount), 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + toNumber(tx.amount), 0);
  const netFlow = totalIncome - totalExpense;
  const transactionCount = transactions.length;
  const unmappedSpend = transactions
    .filter((tx) => tx.type === "expense" && !tx.envelopeId)
    .reduce((acc, tx) => acc + toNumber(tx.amount), 0);
  const mappedRatio = totalExpense ? unmappedSpend / totalExpense : 0;

  const dates = transactions
    .map((tx) => tx.occurred_on)
    .sort((a, b) => (a > b ? 1 : -1));

  const lastActivity = dates.length ? dates[dates.length - 1] : undefined;

  const mappedCategories = new Set(mappings.map((mapping) => mapping.category_id)).size;
  const totalCategories = categories.length;
  const allocatedEnvelopes = new Set(allocatedEnvelopeIds).size;

  return {
    totalIncome,
    totalExpense,
    netFlow,
    transactionCount,
    unmappedSpend,
    mappedRatio,
    lastActivity,
    mappedCategories,
    totalCategories,
    allocatedEnvelopes,
  };
};

export const buildQualityChecks = (data: {
  mappedCategoryRatio: number;
  unmappedExpenses: number;
  envelopesNeverAllocated: number;
  sweepDue: boolean;
}) => {
  const checks = [] as { label: string; value: string; status: "good" | "warn" }[];
  checks.push({
    label: "Mapped categories",
    value: `${(data.mappedCategoryRatio * 100).toFixed(1)}% mapped`,
    status: data.mappedCategoryRatio < 0.7 ? "warn" : "good",
  });
  checks.push({
    label: "Unmapped expenses",
    value: `${data.unmappedExpenses.toFixed(2)}`,
    status: data.unmappedExpenses > 0 ? "warn" : "good",
  });
  checks.push({
    label: "Envelopes never funded",
    value: `${data.envelopesNeverAllocated}`,
    status: data.envelopesNeverAllocated > 0 ? "warn" : "good",
  });
  checks.push({
    label: "Sweep due",
    value: data.sweepDue ? "Yes" : "No",
    status: data.sweepDue ? "warn" : "good",
  });
  return checks;
};

export const buildInsights = (data: {
  totalIncome: number;
  totalExpense: number;
  topEnvelope?: { name: string; total: number };
  mappedRatio: number;
  busiestDay?: { date: string; total: number };
  savingsChange?: number;
  hasLowData: boolean;
}) => {
  if (data.hasLowData) {
    return [
      "Add your first expense to unlock spending insights.",
      "Map categories to envelopes to see envelope performance.",
      "Allocate budgets to compare plan vs actual.",
      "Run your first sweep to keep envelopes tidy.",
      "Add at least 3 transactions for richer trends.",
    ];
  }

  const insights: string[] = [];
  insights.push(
    data.totalExpense > data.totalIncome
      ? "Spending exceeded income in the selected period."
      : "Income covered spending for the selected period."
  );

  if (data.topEnvelope) {
    insights.push(
      `Top envelope spend: ${data.topEnvelope.name} (${data.topEnvelope.total.toFixed(2)}).`
    );
  }

  insights.push(
    `Unmapped expenses represent ${(data.mappedRatio * 100).toFixed(1)}% of spend.`
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

  return insights;
};

export const buildDemoData = (dateRange: { start: string; end: string }) => {
  const envelopes: EnvelopeOut[] = [
    {
      id: "demo-cash",
      name: "Cash",
      rollover_enabled: false,
      is_default_savings: false,
      deletable: false,
      is_cash: true,
    },
    {
      id: "demo-food",
      name: "Food",
      rollover_enabled: false,
      is_default_savings: false,
      deletable: true,
    },
    {
      id: "demo-home",
      name: "Home",
      rollover_enabled: false,
      is_default_savings: false,
      deletable: true,
    },
  ];
  const categories: CategoryOut[] = [
    { id: "demo-groceries", name: "Groceries" },
    { id: "demo-rent", name: "Rent" },
    { id: "demo-salary", name: "Salary" },
  ];
  const mappings: CategoryEnvelopeMapOut[] = [
    { category_id: "demo-groceries", envelope_id: "demo-food" },
    { category_id: "demo-rent", envelope_id: "demo-home" },
  ];
  const transactions: TransactionOut[] = [
    {
      id: "demo-income-1",
      type: "income",
      category_id: "demo-salary",
      amount: "4200.00",
      occurred_on: dateRange.start,
      description: "Demo income",
    },
    {
      id: "demo-expense-1",
      type: "expense",
      category_id: "demo-groceries",
      amount: "120.50",
      occurred_on: addDays(dateRange.start, 2),
      description: "Groceries",
    },
    {
      id: "demo-expense-2",
      type: "expense",
      category_id: "demo-rent",
      amount: "950.00",
      occurred_on: addDays(dateRange.start, 5),
      description: "Rent",
    },
  ];

  return { envelopes, categories, mappings, transactions };
};
