/**
 * Pay timing in the onboarding: ONE screen per pay frequency ("which day?",
 * with the "it varies" ranges on the same screen) instead of a "mode" screen
 * followed by a "value" screen.
 *
 * The screen stores a composite answer ("fixed_day:25", "range:25-30"). It is
 * expanded back into the historical answer keys (S4_date_mode + S4a_fixed_day,
 * F3_retainer_day_mode + F3a_retainer_fixed_day, …) because the salary
 * schedule, the backend sweep context and every saved draft read those keys.
 * Those keys must therefore never be renamed.
 */

export type PayTimingOption = { value: string; label: string };
export type PayTimingOptionGroup = { id: string; title: string; options: PayTimingOption[] };
export type PayTimingAnswers = Record<string, unknown>;

type PayTimingTarget = { mode: string; valueKey: string };

export type PayTimingSpec = {
  questionId: string;
  modeKey: string;
  groups: PayTimingOptionGroup[];
  kinds: Record<string, PayTimingTarget>;
  /** Modes that only exist in drafts saved before the merge. */
  legacyKinds?: Record<string, PayTimingTarget & { mapsTo: string }>;
};

export const DAY_OPTIONS: PayTimingOption[] = [
  { value: "20", label: "20" },
  { value: "25", label: "25" },
  { value: "28", label: "28" },
  { value: "30", label: "30" },
  { value: "1", label: "1" },
];

export const RANGE_OPTIONS: PayTimingOption[] = [
  { value: "20-24", label: "بين 20 و24" },
  { value: "25-30", label: "بين 25 و30" },
  { value: "1-5", label: "بين 1 و5" },
];

export const WEEKDAY_OPTIONS: PayTimingOption[] = [
  { value: "mon", label: "الإثنين" },
  { value: "tue", label: "الثلاثاء" },
  { value: "wed", label: "الأربعاء" },
  { value: "thu", label: "الخميس" },
  { value: "fri", label: "الجمعة" },
  { value: "sat", label: "السبت" },
  { value: "sun", label: "الأحد" },
];

export const BIWEEKLY_MONTH_DATES_OPTIONS: PayTimingOption[] = [
  { value: "1-15", label: "1 و15" },
  { value: "5-20", label: "5 و20" },
  { value: "10-25", label: "10 و25" },
  { value: "15-30", label: "15 و30" },
];

export const BIWEEKLY_RANGE_OPTIONS: PayTimingOption[] = [
  { value: "1-5_16-20", label: "بين 1-5 و16-20" },
  { value: "5-10_20-25", label: "بين 5-10 و20-25" },
  { value: "10-15_25-30", label: "بين 10-15 و25-30" },
];

export const WEEKLY_RANGE_OPTIONS: PayTimingOption[] = [
  { value: "mon-tue", label: "بين الإثنين والثلاثاء" },
  { value: "wed-thu", label: "بين الأربعاء والخميس" },
  { value: "fri-sat", label: "بين الجمعة والسبت" },
];

function toPayTimingOptions(kind: string, options: PayTimingOption[]): PayTimingOption[] {
  return options.map((option) => ({ value: `${kind}:${option.value}`, label: option.label }));
}

const MONTHLY_GROUPS: PayTimingOptionGroup[] = [
  { id: "fixed_day", title: "نهار ثابت", options: toPayTimingOptions("fixed_day", DAY_OPTIONS) },
  { id: "range", title: "كيبدّل شوية", options: toPayTimingOptions("range", RANGE_OPTIONS) },
];

const BIWEEKLY_GROUPS: PayTimingOptionGroup[] = [
  {
    id: "fixed_weekday",
    title: "نهار ثابت فالأسبوع (كل 15 يوم)",
    options: toPayTimingOptions("fixed_weekday", WEEKDAY_OPTIONS),
  },
  {
    id: "month_dates",
    title: "جوج تواريخ ثابتين فالشهر",
    options: toPayTimingOptions("month_dates", BIWEEKLY_MONTH_DATES_OPTIONS),
  },
  { id: "range", title: "كيبدّل شوية", options: toPayTimingOptions("range", BIWEEKLY_RANGE_OPTIONS) },
];

const WEEKLY_GROUPS: PayTimingOptionGroup[] = [
  { id: "fixed_weekday", title: "نهار ثابت", options: toPayTimingOptions("fixed_weekday", WEEKDAY_OPTIONS) },
  { id: "range", title: "كيبدّل بيوم ولا جوج", options: toPayTimingOptions("range", WEEKLY_RANGE_OPTIONS) },
];

export const PAY_TIMING_SPECS: PayTimingSpec[] = [
  {
    questionId: "S4_pay_timing_monthly",
    modeKey: "S4_date_mode",
    groups: MONTHLY_GROUPS,
    kinds: {
      fixed_day: { mode: "fixed_day", valueKey: "S4a_fixed_day" },
      range: { mode: "range", valueKey: "S4b_range" },
    },
  },
  {
    questionId: "S4_pay_timing_biweekly",
    modeKey: "S4c_biweekly_mode",
    groups: BIWEEKLY_GROUPS,
    kinds: {
      fixed_weekday: { mode: "fixed_weekday", valueKey: "S4c1_biweekly_weekday" },
      month_dates: { mode: "month_dates", valueKey: "S4c2_biweekly_month_dates" },
      range: { mode: "range", valueKey: "S4c3_biweekly_range" },
    },
  },
  {
    questionId: "S4_pay_timing_weekly",
    modeKey: "S4d_weekly_mode",
    groups: WEEKLY_GROUPS,
    kinds: {
      fixed_weekday: { mode: "fixed_weekday", valueKey: "S4d1_weekly_weekday" },
      range: { mode: "range", valueKey: "S4d3_weekly_range" },
    },
    legacyKinds: {
      weekend: { mode: "weekend", valueKey: "S4d2_weekly_weekend_day", mapsTo: "fixed_weekday" },
    },
  },
  {
    questionId: "F3_retainer_pay_timing",
    modeKey: "F3_retainer_day_mode",
    groups: MONTHLY_GROUPS,
    kinds: {
      fixed_day: { mode: "fixed_day", valueKey: "F3a_retainer_fixed_day" },
      range: { mode: "range", valueKey: "F3b_retainer_range" },
    },
  },
  {
    questionId: "M2_pay_timing_monthly",
    modeKey: "M2a_monthly_mode",
    groups: MONTHLY_GROUPS,
    kinds: {
      fixed_day: { mode: "fixed_day", valueKey: "M2b_monthly_fixed_day" },
      range: { mode: "range", valueKey: "M2b_monthly_range" },
    },
  },
  {
    questionId: "M2_pay_timing_weekly",
    modeKey: "M2c_weekly_mode",
    groups: WEEKLY_GROUPS,
    kinds: {
      fixed_weekday: { mode: "fixed_weekday", valueKey: "M2d_weekly_fixed_day" },
      range: { mode: "range", valueKey: "M2d_weekly_range" },
    },
    legacyKinds: {
      weekend: { mode: "weekend", valueKey: "M2d_weekly_weekend_day", mapsTo: "fixed_weekday" },
    },
  },
];

const SPEC_BY_QUESTION_ID = new Map(PAY_TIMING_SPECS.map((spec) => [spec.questionId, spec]));

function readString(answers: PayTimingAnswers, key: string): string {
  const value = answers[key];
  return typeof value === "string" ? value : "";
}

export function getPayTimingSpec(questionId: string): PayTimingSpec | undefined {
  return SPEC_BY_QUESTION_ID.get(questionId);
}

export function getPayTimingOptions(spec: PayTimingSpec): {
  options: PayTimingOption[];
  groupedOptions: PayTimingOptionGroup[];
} {
  return {
    options: spec.groups.flatMap((group) => group.options),
    groupedOptions: spec.groups,
  };
}

function splitPayTimingValue(value: string): { kind: string; detail: string } | null {
  const separatorIndex = value.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null;
  return { kind: value.slice(0, separatorIndex), detail: value.slice(separatorIndex + 1) };
}

/** Stores the composite answer and the historical mode/value keys it stands for. */
export function applyPayTimingAnswer<T extends PayTimingAnswers>(answers: T, spec: PayTimingSpec, value: string): T {
  const next: PayTimingAnswers = { ...answers, [spec.questionId]: value };
  const parsed = splitPayTimingValue(value);
  const target = parsed ? spec.kinds[parsed.kind] : undefined;
  if (!parsed || !target) return next as T;

  Object.values(spec.kinds).forEach((entry) => {
    delete next[entry.valueKey];
  });
  Object.values(spec.legacyKinds ?? {}).forEach((entry) => {
    delete next[entry.valueKey];
  });
  next[spec.modeKey] = target.mode;
  next[target.valueKey] = parsed.detail;
  return next as T;
}

/** The composite answer implied by the historical keys, or "" when they are incomplete. */
export function getPayTimingValueFromLegacyAnswers(answers: PayTimingAnswers, spec: PayTimingSpec): string {
  const mode = readString(answers, spec.modeKey);
  if (!mode) return "";
  const allowedValues = new Set(spec.groups.flatMap((group) => group.options.map((option) => option.value)));
  const current = Object.entries(spec.kinds).find(([, entry]) => entry.mode === mode);
  if (current) {
    const composite = `${current[0]}:${readString(answers, current[1].valueKey)}`;
    return allowedValues.has(composite) ? composite : "";
  }
  const legacy = Object.values(spec.legacyKinds ?? {}).find((entry) => entry.mode === mode);
  if (legacy) {
    const composite = `${legacy.mapsTo}:${readString(answers, legacy.valueKey)}`;
    return allowedValues.has(composite) ? composite : "";
  }
  return "";
}

/** Fills the composite answers of drafts saved before the screens merged. */
export function withPayTimingAnswersFromLegacy<T extends PayTimingAnswers>(answers: T): T {
  let next: PayTimingAnswers = answers;
  PAY_TIMING_SPECS.forEach((spec) => {
    if (readString(next, spec.questionId)) return;
    const composite = getPayTimingValueFromLegacyAnswers(next, spec);
    if (!composite) return;
    if (next === answers) next = { ...answers };
    next[spec.questionId] = composite;
  });
  return next as T;
}

/** Every historical key, mapped to the merged screen that now asks it. */
export function getPayTimingLegacyQuestionAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  PAY_TIMING_SPECS.forEach((spec) => {
    aliases[spec.modeKey] = spec.questionId;
    Object.values(spec.kinds).forEach((entry) => {
      aliases[entry.valueKey] = spec.questionId;
    });
    Object.values(spec.legacyKinds ?? {}).forEach((entry) => {
      aliases[entry.valueKey] = spec.questionId;
    });
  });
  return aliases;
}
