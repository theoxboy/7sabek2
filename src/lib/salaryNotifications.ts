"use client";

export type SalaryWeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type SalaryScheduleProfile = {
  incomeType: "salaried";
  stability: "stable" | "variable";
  frequency: "monthly" | "biweekly" | "weekly";
  timingMode:
    | "fixed_day"
    | "range"
    | "fixed_weekday"
    | "end_of_week"
    | "two_fixed_dates"
    | "range_pairs";
  certainty: "confident" | "soft";
  fixedDay?: number;
  fixedDates?: number[];
  fixedWeekday?: SalaryWeekdayKey;
  rangeStart?: number | SalaryWeekdayKey;
  rangeEnd?: number | SalaryWeekdayKey;
  secondaryRangeStart?: number;
  secondaryRangeEnd?: number;
  rangeLabel?: string;
  amount?: number | null;
  displayLabel: string;
};

export type SalaryNotificationActionState = {
  status: "confirmed" | "delayed";
  updatedAt: string;
  nextRetryOn?: string;
  promptedOn?: string;
  receivedAmount?: number;
};

export type SalaryNotificationState = {
  cycles: Record<string, SalaryNotificationActionState>;
};

export type SalaryNotificationScenario = {
  id: string;
  cycleKey: string;
  title: string;
  description: string;
  ctaConfirm: string;
  ctaWait: string;
  ctaAdjust: string;
  frequencyLabel: string;
  timingLabel: string;
  certainty: "confident" | "soft";
  state: "pending" | "confirmed" | "delayed";
  dueNow: boolean;
  shouldPrompt: boolean;
  meta: string;
  statusText: string;
};

export type IncomePopupAmountMode = "prefilled" | "suggested" | "manual";
export type IncomePopupConfidence = "high" | "medium" | "low";

export type IncomePopupPreviewModel = {
  incomeType: "salaried" | "hirafi" | "freelancer" | "mixed" | "unknown";
  amountClaimMode: IncomePopupAmountMode;
  confidence: IncomePopupConfidence;
  expectedAmount: number | null;
  title: string;
  helperText: string;
  confirmLabel: string;
  waitLabel: string;
  amountBadge: string;
};

export type IncomePopupPreviewCase = {
  id: string;
  label: string;
  state: "pending" | "confirmed" | "delayed";
  confirmedAmount?: number;
  model: IncomePopupPreviewModel;
};

type GenericRecord = Record<string, unknown>;

const WEEKDAY_LABELS: Record<SalaryWeekdayKey, string> = {
  mon: "الإثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
  sat: "السبت",
  sun: "الأحد",
};

const WEEKDAY_TO_INDEX: Record<SalaryWeekdayKey, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

function getString(source: GenericRecord, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDayRange(value: string): [number, number] | null {
  const parts = value.split("-").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) return null;
  return [parts[0], parts[1]];
}

function parseWeekdayRange(value: string): [SalaryWeekdayKey, SalaryWeekdayKey] | null {
  const parts = value.split("-").map((part) => part.trim()) as SalaryWeekdayKey[];
  if (parts.length !== 2) return null;
  if (!(parts[0] in WEEKDAY_TO_INDEX) || !(parts[1] in WEEKDAY_TO_INDEX)) return null;
  return [parts[0], parts[1]];
}

function getDateForDayOfMonth(reference: Date, day: number): Date {
  const normalized = Math.max(1, Math.min(day, 31));
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const maxDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(normalized, maxDay));
}

function getWeekdayDate(reference: Date, weekday: SalaryWeekdayKey): Date {
  const currentWeekday = (reference.getDay() + 6) % 7;
  const target = WEEKDAY_TO_INDEX[weekday];
  const delta = target - currentWeekday;
  return addDays(startOfDay(reference), delta);
}

function getIsoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
}

export function isBetaAuthorized(user?: { is_beta_tester?: boolean; role?: string } | null): boolean {
  return Boolean(user?.is_beta_tester || user?.role === "superadmin");
}

export function buildSalaryScheduleProfile(answersInput: unknown): SalaryScheduleProfile | null {
  const answers = answersInput && typeof answersInput === "object" ? (answersInput as GenericRecord) : {};
  if (getString(answers, "Q0_income_type") !== "salaried") return null;

  const stability = getString(answers, "S1_stability");
  const frequency = getString(answers, "S3_frequency");
  const amount = toNumber(answers.S2a_salary_amount);
  const isStable = stability === "fixed";

  if (frequency === "monthly") {
    const dateMode = getString(answers, "S4_date_mode");
    if (dateMode === "fixed_day") {
      const fixedDay = Number(getString(answers, "S4a_fixed_day"));
      if (Number.isNaN(fixedDay)) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "monthly",
        timingMode: "fixed_day",
        certainty: isStable ? "confident" : "soft",
        fixedDay,
        amount,
        displayLabel: `كل شهر نهار ${fixedDay}`,
      };
    }
    if (dateMode === "range") {
      const range = parseDayRange(getString(answers, "S4b_range"));
      if (!range) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "monthly",
        timingMode: "range",
        certainty: "soft",
        rangeStart: range[0],
        rangeEnd: range[1],
        rangeLabel: `${range[0]}-${range[1]}`,
        amount,
        displayLabel: `كل شهر بين ${range[0]} و${range[1]}`,
      };
    }
    return null;
  }

  if (frequency === "biweekly") {
    const biweeklyMode = getString(answers, "S4c_biweekly_mode");
    if (biweeklyMode === "fixed_weekday") {
      const fixedWeekday = getString(answers, "S4c1_biweekly_weekday") as SalaryWeekdayKey;
      if (!(fixedWeekday in WEEKDAY_TO_INDEX)) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "biweekly",
        timingMode: "fixed_weekday",
        certainty: isStable ? "confident" : "soft",
        fixedWeekday,
        amount,
        displayLabel: `كل 15 يوم نهار ${WEEKDAY_LABELS[fixedWeekday]}`,
      };
    }
    if (biweeklyMode === "month_dates") {
      const range = parseDayRange(getString(answers, "S4c2_biweekly_month_dates"));
      if (!range) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "biweekly",
        timingMode: "two_fixed_dates",
        certainty: isStable ? "confident" : "soft",
        fixedDates: [range[0], range[1]],
        amount,
        displayLabel: `مرتين فالشهر: ${range[0]} و${range[1]}`,
      };
    }
    if (biweeklyMode === "range") {
      const ranges = getString(answers, "S4c3_biweekly_range").split("_");
      const first = parseDayRange(ranges[0] ?? "");
      const second = parseDayRange(ranges[1] ?? "");
      if (!first || !second) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "biweekly",
        timingMode: "range_pairs",
        certainty: "soft",
        rangeStart: first[0],
        rangeEnd: first[1],
        secondaryRangeStart: second[0],
        secondaryRangeEnd: second[1],
        rangeLabel: `${first[0]}-${first[1]} / ${second[0]}-${second[1]}`,
        amount,
        displayLabel: `مرتين فالشهر داخل window متبدل`,
      };
    }
    return null;
  }

  if (frequency === "weekly") {
    const weeklyMode = getString(answers, "S4d_weekly_mode");
    if (weeklyMode === "fixed_weekday") {
      const fixedWeekday = getString(answers, "S4d1_weekly_weekday") as SalaryWeekdayKey;
      if (!(fixedWeekday in WEEKDAY_TO_INDEX)) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "weekly",
        timingMode: "fixed_weekday",
        certainty: isStable ? "confident" : "soft",
        fixedWeekday,
        amount,
        displayLabel: `كل أسبوع نهار ${WEEKDAY_LABELS[fixedWeekday]}`,
      };
    }
    if (weeklyMode === "weekend") {
      const fixedWeekday = getString(answers, "S4d2_weekly_weekend_day") as SalaryWeekdayKey;
      if (!(fixedWeekday in WEEKDAY_TO_INDEX)) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "weekly",
        timingMode: "end_of_week",
        certainty: isStable ? "confident" : "soft",
        fixedWeekday,
        amount,
        displayLabel: `كل أسبوع فآخر الأسبوع نهار ${WEEKDAY_LABELS[fixedWeekday]}`,
      };
    }
    if (weeklyMode === "range") {
      const range = parseWeekdayRange(getString(answers, "S4d3_weekly_range"));
      if (!range) return null;
      return {
        incomeType: "salaried",
        stability: isStable ? "stable" : "variable",
        frequency: "weekly",
        timingMode: "range",
        certainty: "soft",
        rangeStart: range[0],
        rangeEnd: range[1],
        rangeLabel: `${WEEKDAY_LABELS[range[0]]} - ${WEEKDAY_LABELS[range[1]]}`,
        amount,
        displayLabel: `كل أسبوع بين ${WEEKDAY_LABELS[range[0]]} و${WEEKDAY_LABELS[range[1]]}`,
      };
    }
  }

  return null;
}

export function extractLatestSalaryScheduleProfile(recordPayload: unknown): SalaryScheduleProfile | null {
  const payload = recordPayload && typeof recordPayload === "object" ? (recordPayload as GenericRecord) : {};
  const draftObjects = payload.draft_objects && typeof payload.draft_objects === "object"
    ? (payload.draft_objects as GenericRecord)
    : {};
  const draftProfile =
    draftObjects.salary_schedule_profile && typeof draftObjects.salary_schedule_profile === "object"
      ? (draftObjects.salary_schedule_profile as SalaryScheduleProfile)
      : null;
  if (draftProfile && draftProfile.incomeType === "salaried") return draftProfile;
  const answers = payload.answers && typeof payload.answers === "object" ? payload.answers : {};
  return buildSalaryScheduleProfile(answers);
}

export function getSalaryCyclesPerMonth(frequency?: string | null): number {
  if (frequency === "weekly") return 4;
  if (frequency === "biweekly") return 2;
  return 1;
}

export function getExpectedSalaryAmountPerEntry(
  monthlyAmount: number | null,
  frequency?: string | null
): number | null {
  if (typeof monthlyAmount !== "number" || !Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
    return null;
  }
  return roundMoney(monthlyAmount / getSalaryCyclesPerMonth(frequency));
}

export function getSalaryEntryFrequencyLabel(frequency?: string | null): string {
  if (frequency === "weekly") return "دخل كل دفعة أسبوعية";
  if (frequency === "biweekly") return "دخل كل دفعة ديال 15 يوم";
  return "دخل هاد الدفعة";
}

function getPayloadAnswers(recordPayload: unknown): GenericRecord {
  const payload = recordPayload && typeof recordPayload === "object"
    ? (recordPayload as GenericRecord)
    : {};
  if (payload.answers && typeof payload.answers === "object") {
    return payload.answers as GenericRecord;
  }
  return payload;
}

function getDraftIncomeProfile(recordPayload: unknown): GenericRecord {
  const payload = recordPayload && typeof recordPayload === "object"
    ? (recordPayload as GenericRecord)
    : {};
  const draftObjects =
    payload.draft_objects && typeof payload.draft_objects === "object"
      ? (payload.draft_objects as GenericRecord)
      : {};
  return draftObjects.income_profile && typeof draftObjects.income_profile === "object"
    ? (draftObjects.income_profile as GenericRecord)
    : {};
}

function buildIncomePopupModel(params: {
  incomeType: IncomePopupPreviewModel["incomeType"];
  amountClaimMode: IncomePopupAmountMode;
  confidence: IncomePopupConfidence;
  expectedAmount: number | null;
}): IncomePopupPreviewModel {
  const { incomeType, amountClaimMode, confidence, expectedAmount } = params;

  if (amountClaimMode === "prefilled") {
    return {
      incomeType,
      amountClaimMode,
      confidence,
      expectedAmount,
      title: "واش توصلتي بالسالاير ديالك؟",
      helperText: "وجدنا ليك المبلغ المتوقع، وإذا تبدّل كتقدر تبدلو.",
      confirmLabel: "تأكيد",
      waitLabel: "مازال",
      amountBadge: "مبلغ متوقع",
    };
  }

  if (amountClaimMode === "suggested") {
    return {
      incomeType,
      amountClaimMode,
      confidence,
      expectedAmount,
      title: "واش توصّلتي بالدخل ديالك؟",
      helperText: "إذا تبدّل المبلغ، دخل الرقم اللي توصّلتي به.",
      confirmLabel: "سجّل",
      waitLabel: "مازال",
      amountBadge: "اقتراح قابل للتبديل",
    };
  }

  return {
    incomeType,
    amountClaimMode,
    confidence,
    expectedAmount,
    title: "واش توصّلتي بالدخل ديالك؟",
    helperText: "دخل شحال توصّلتي به.",
    confirmLabel: "سجّل",
    waitLabel: "مازال",
    amountBadge: "دخول يدوي",
  };
}

export function resolveIncomePopupPreviewModel(
  recordPayload: unknown
): IncomePopupPreviewModel | null {
  const answers = getPayloadAnswers(recordPayload);
  const incomeProfile = getDraftIncomeProfile(recordPayload);
  const incomeTypeRaw =
    getString(incomeProfile, "income_type") || getString(answers, "Q0_income_type");

  const incomeType =
    incomeTypeRaw === "salaried" ||
    incomeTypeRaw === "hirafi" ||
    incomeTypeRaw === "freelancer" ||
    incomeTypeRaw === "mixed"
      ? incomeTypeRaw
      : "unknown";

  const data =
    incomeProfile.data && typeof incomeProfile.data === "object"
      ? (incomeProfile.data as GenericRecord)
      : {};

  if (incomeType === "salaried") {
    const salaried =
      data.salaried && typeof data.salaried === "object"
        ? (data.salaried as GenericRecord)
        : {};
    const monthlyAmount = toNumber(salaried.amount ?? answers.S2a_salary_amount);
    const frequency =
      getString(salaried, "frequency") ||
      extractLatestSalaryScheduleProfile(recordPayload)?.frequency ||
      getString(answers, "S3_frequency") ||
      "monthly";
    const amount = getExpectedSalaryAmountPerEntry(monthlyAmount, frequency);
    const stability =
      getString(salaried, "stability") || getString(answers, "S1_stability");

    if (stability === "fixed" && amount) {
      return buildIncomePopupModel({
        incomeType,
        amountClaimMode: "prefilled",
        confidence: "high",
        expectedAmount: amount,
      });
    }
    if (amount) {
      return buildIncomePopupModel({
        incomeType,
        amountClaimMode: "suggested",
        confidence: "medium",
        expectedAmount: amount,
      });
    }
    return buildIncomePopupModel({
      incomeType,
      amountClaimMode: "manual",
      confidence: "low",
      expectedAmount: null,
    });
  }

  if (incomeType === "mixed") {
    const mixed =
      data.mixed && typeof data.mixed === "object"
        ? (data.mixed as GenericRecord)
        : {};
    const minIncome = toNumber(mixed.min_income ?? answers.M3_min_income);
    if (minIncome) {
      return buildIncomePopupModel({
        incomeType,
        amountClaimMode: "suggested",
        confidence: "medium",
        expectedAmount: minIncome,
      });
    }
    return buildIncomePopupModel({
      incomeType,
      amountClaimMode: "manual",
      confidence: "low",
      expectedAmount: null,
    });
  }

  if (incomeType === "freelancer") {
    const freelancer =
      data.freelancer && typeof data.freelancer === "object"
        ? (data.freelancer as GenericRecord)
        : {};
    const minIncome = toNumber(freelancer.min_income ?? answers.F7_min_income);
    const paymentMode =
      getString(freelancer, "payment_mode") || getString(answers, "F1_payment_mode");
    const retainerStability =
      getString(freelancer, "retainer_stability") ||
      getString(answers, "F2_retainer_stability");

    if (paymentMode === "retainer" && retainerStability === "fixed" && minIncome) {
      return buildIncomePopupModel({
        incomeType,
        amountClaimMode: "suggested",
        confidence: "medium",
        expectedAmount: minIncome,
      });
    }
    return buildIncomePopupModel({
      incomeType,
      amountClaimMode: "manual",
      confidence: "low",
      expectedAmount: null,
    });
  }

  if (incomeType === "hirafi") {
    return buildIncomePopupModel({
      incomeType,
      amountClaimMode: "manual",
      confidence: "low",
      expectedAmount: null,
    });
  }

  return null;
}

export function buildIncomePopupPreviewCases(
  recordPayload: unknown
): IncomePopupPreviewCase[] {
  const cases: IncomePopupPreviewCase[] = [];

  const actualModel = resolveIncomePopupPreviewModel(recordPayload);
  if (actualModel) {
    cases.push({
      id: "actual-profile",
      label: "الحالة ديالك دابا",
      state: "pending",
      model: actualModel,
    });
  }

  const fixedStableModel = resolveIncomePopupPreviewModel({
    answers: {
      Q0_income_type: "salaried",
      S1_stability: "fixed",
      S2a_salary_amount: "6500",
    },
  });
  const variableSalaryModel = resolveIncomePopupPreviewModel({
    answers: {
      Q0_income_type: "salaried",
      S1_stability: "variable",
      S2a_salary_amount: "6200",
    },
  });
  const manualIncomeModel = resolveIncomePopupPreviewModel({
    answers: {
      Q0_income_type: "hirafi",
      H3_income_profile_min: "4000",
    },
  });

  if (fixedStableModel) {
    cases.push({
      id: "fixed-prefilled",
      label: "سالاير ثابت",
      state: "pending",
      model: fixedStableModel,
    });
    cases.push({
      id: "fixed-confirmed",
      label: "حالة مؤكدة",
      state: "confirmed",
      confirmedAmount: fixedStableModel.expectedAmount ?? 6500,
      model: fixedStableModel,
    });
  }

  if (variableSalaryModel) {
    cases.push({
      id: "variable-suggested",
      label: "سالاير متبدّل",
      state: "pending",
      model: variableSalaryModel,
    });
    cases.push({
      id: "variable-delayed",
      label: "حالة مازال",
      state: "delayed",
      model: variableSalaryModel,
    });
  }

  if (manualIncomeModel) {
    cases.push({
      id: "manual-income",
      label: "دخل متغيّر بزاف",
      state: "pending",
      model: manualIncomeModel,
    });
  }

  return cases;
}

function getFrequencyLabel(profile: SalaryScheduleProfile): string {
  if (profile.frequency === "monthly") return "شهري";
  if (profile.frequency === "biweekly") return "كل 15 يوم";
  return "أسبوعي";
}

function getTimingLabel(profile: SalaryScheduleProfile): string {
  if (profile.timingMode === "fixed_day" && profile.fixedDay) return `نهار ${profile.fixedDay}`;
  if (profile.timingMode === "two_fixed_dates" && profile.fixedDates?.length === 2) {
    return `${profile.fixedDates[0]} و${profile.fixedDates[1]}`;
  }
  if (
    (profile.timingMode === "fixed_weekday" || profile.timingMode === "end_of_week") &&
    profile.fixedWeekday
  ) {
    return WEEKDAY_LABELS[profile.fixedWeekday];
  }
  if (profile.timingMode === "range") {
    if (typeof profile.rangeStart === "number" && typeof profile.rangeEnd === "number") {
      return `بين ${profile.rangeStart} و${profile.rangeEnd}`;
    }
    if (typeof profile.rangeStart === "string" && typeof profile.rangeEnd === "string") {
      return `بين ${WEEKDAY_LABELS[profile.rangeStart]} و${WEEKDAY_LABELS[profile.rangeEnd]}`;
    }
  }
  if (profile.timingMode === "range_pairs") {
    return profile.rangeLabel ?? "window متبدل";
  }
  return profile.displayLabel;
}

function resolveCycleForProfile(profile: SalaryScheduleProfile, today: Date) {
  const todayDate = startOfDay(today);
  const todayIso = toIsoDate(todayDate);

  if (profile.frequency === "monthly" && profile.timingMode === "fixed_day" && profile.fixedDay) {
    const dueDate = getDateForDayOfMonth(todayDate, profile.fixedDay);
    const windowStart = dueDate;
    const windowEnd = addDays(dueDate, 1);
    return {
      cycleKey: `salary:${profile.frequency}:${toIsoDate(dueDate)}`,
      windowStart: toIsoDate(windowStart),
      windowEnd: toIsoDate(windowEnd),
      dueNow: todayIso >= toIsoDate(windowStart) && todayIso <= toIsoDate(windowEnd),
      copyMode: "fixed" as const,
    };
  }

  if (
    profile.frequency === "monthly" &&
    profile.timingMode === "range" &&
    typeof profile.rangeStart === "number" &&
    typeof profile.rangeEnd === "number"
  ) {
    const windowStart = getDateForDayOfMonth(todayDate, profile.rangeStart);
    const windowEnd = getDateForDayOfMonth(todayDate, profile.rangeEnd);
    return {
      cycleKey: `salary:${profile.frequency}:${todayDate.getFullYear()}-${todayDate.getMonth() + 1}:${profile.rangeStart}-${profile.rangeEnd}`,
      windowStart: toIsoDate(windowStart),
      windowEnd: toIsoDate(windowEnd),
      dueNow: todayIso >= toIsoDate(windowStart) && todayIso <= toIsoDate(windowEnd),
      copyMode: "range" as const,
    };
  }

  if (
    profile.frequency === "weekly" &&
    (profile.timingMode === "fixed_weekday" || profile.timingMode === "end_of_week") &&
    profile.fixedWeekday
  ) {
    const dueDate = getWeekdayDate(todayDate, profile.fixedWeekday);
    const windowStart = dueDate;
    const windowEnd = addDays(dueDate, 1);
    return {
      cycleKey: `salary:${profile.frequency}:${toIsoDate(dueDate)}`,
      windowStart: toIsoDate(windowStart),
      windowEnd: toIsoDate(windowEnd),
      dueNow: todayIso >= toIsoDate(windowStart) && todayIso <= toIsoDate(windowEnd),
      copyMode: "weekly" as const,
    };
  }

  if (
    profile.frequency === "weekly" &&
    profile.timingMode === "range" &&
    typeof profile.rangeStart === "string" &&
    typeof profile.rangeEnd === "string"
  ) {
    const startIndex = WEEKDAY_TO_INDEX[profile.rangeStart];
    const endIndex = WEEKDAY_TO_INDEX[profile.rangeEnd];
    const todayIndex = (todayDate.getDay() + 6) % 7;
    return {
      cycleKey: `salary:${profile.frequency}:${todayDate.getFullYear()}-w${getIsoWeekNumber(todayDate)}`,
      windowStart: profile.rangeStart,
      windowEnd: profile.rangeEnd,
      dueNow: todayIndex >= startIndex && todayIndex <= endIndex,
      copyMode: "range" as const,
    };
  }

  if (
    profile.frequency === "biweekly" &&
    profile.timingMode === "two_fixed_dates" &&
    profile.fixedDates?.length === 2
  ) {
    const dueDates = profile.fixedDates.map((day) => getDateForDayOfMonth(todayDate, day));
    const matching = dueDates.find((date) => todayIso >= toIsoDate(date) && todayIso <= toIsoDate(addDays(date, 1)));
    const activeDate = matching ?? dueDates[0];
    return {
      cycleKey: `salary:${profile.frequency}:${toIsoDate(activeDate)}`,
      windowStart: toIsoDate(activeDate),
      windowEnd: toIsoDate(addDays(activeDate, 1)),
      dueNow: Boolean(matching),
      copyMode: "biweekly" as const,
    };
  }

  if (
    profile.frequency === "biweekly" &&
    profile.timingMode === "range_pairs" &&
    typeof profile.rangeStart === "number" &&
    typeof profile.rangeEnd === "number" &&
    typeof profile.secondaryRangeStart === "number" &&
    typeof profile.secondaryRangeEnd === "number"
  ) {
    const ranges = [
      [profile.rangeStart, profile.rangeEnd],
      [profile.secondaryRangeStart, profile.secondaryRangeEnd],
    ] as const;
    const matching = ranges.find(([start, end]) => {
      const windowStart = getDateForDayOfMonth(todayDate, start);
      const windowEnd = getDateForDayOfMonth(todayDate, end);
      return todayIso >= toIsoDate(windowStart) && todayIso <= toIsoDate(windowEnd);
    });
    return {
      cycleKey: `salary:${profile.frequency}:${todayDate.getFullYear()}-${todayDate.getMonth() + 1}:${profile.rangeLabel ?? "range_pairs"}`,
      windowStart: matching ? String(matching[0]) : String(profile.rangeStart),
      windowEnd: matching ? String(matching[1]) : String(profile.rangeEnd),
      dueNow: Boolean(matching),
      copyMode: "range" as const,
    };
  }

  if (
    profile.frequency === "biweekly" &&
    profile.timingMode === "fixed_weekday" &&
    profile.fixedWeekday
  ) {
    const weekNumber = getIsoWeekNumber(todayDate);
    const dueDate = getWeekdayDate(todayDate, profile.fixedWeekday);
    const dueThisWeek = weekNumber % 2 === 0;
    return {
      cycleKey: `salary:${profile.frequency}:${todayDate.getFullYear()}-w${weekNumber}`,
      windowStart: toIsoDate(dueDate),
      windowEnd: toIsoDate(addDays(dueDate, 1)),
      dueNow: dueThisWeek && todayIso >= toIsoDate(dueDate) && todayIso <= toIsoDate(addDays(dueDate, 1)),
      copyMode: "biweekly" as const,
    };
  }

  return null;
}

function getSalaryCopy(profile: SalaryScheduleProfile, delayed = false) {
  if (profile.frequency === "weekly") {
    return {
      title: delayed ? "باقي كنستناو السالاير الأسبوعي" : "اليوم غالباً نهار السالاير الأسبوعي ديالك.",
      description: delayed
        ? "مازال؟ ماشي مشكل، غادي نرجعو نذكروك بلطف من بعد."
        : profile.certainty === "confident"
        ? "إلا توصّلتي به، سجّلو دابا."
        : "إلا وصل اليوم ولا غدا، أكّد غير باش نرتّبو ليك الباقي.",
    };
  }
  if (profile.frequency === "biweekly") {
    return {
      title: delayed
        ? "الدفعة ديال هاد النصف ديال الشهر مازال؟"
        : "اليوم غالباً موعد الدفعة ديال هاد النصف ديال الشهر.",
      description: delayed
        ? "غادي نرجعو نسولوك من بعد بلا ما نزعجوك بزاف."
        : profile.certainty === "confident"
        ? "إلا توصّلتي بها، سجّلها دابا."
        : "منين توصل، أكّد غير باش نبقاو منظمين.",
    };
  }
  if (profile.timingMode === "range" || profile.timingMode === "range_pairs") {
    return {
      title: delayed
        ? "مازال كنسناو السالاير داخل هاد الأيام."
        : "هاد الأيام غالباً كيدخل السالاير ديالك.",
      description: delayed
        ? "غادي نعاودو نذكروك بلطف داخل نفس window."
        : "منين يوصلك، أكّد غير باش نرتّبو ليك الباقي.",
    };
  }
  return {
    title: delayed ? "مازال السالاير ما وصلش؟" : "اليوم غالباً كيوصل السالاير ديالك 👋",
    description: delayed
      ? "غادي نرجعو نذكروك من بعد بلا سبام."
      : profile.certainty === "confident"
      ? "إلا توصّلتي به، سجّلو دابا."
      : "إلا وصلك اليوم ولا قريب، أكّد غير باش نرتّبو ليك الباقي.",
  };
}

export function buildLiveSalaryNotification(
  profile: SalaryScheduleProfile | null,
  state: SalaryNotificationState,
  today = new Date()
): SalaryNotificationScenario | null {
  if (!profile) return null;
  const cycle = resolveCycleForProfile(profile, today);
  if (!cycle || !cycle.dueNow) return null;

  const cycleState = state.cycles[cycle.cycleKey];
  const todayIso = toIsoDate(startOfDay(today));

  if (cycleState?.status === "confirmed") return null;
  if (cycleState?.status === "delayed" && cycleState.nextRetryOn && cycleState.nextRetryOn > todayIso) {
    return null;
  }

  const delayed = cycleState?.status === "delayed";
  const copy = getSalaryCopy(profile, delayed);
  return {
    id: `salary-beta:${cycle.cycleKey}`,
    cycleKey: cycle.cycleKey,
    title: copy.title,
    description: copy.description,
    ctaConfirm: "توصّلت به",
    ctaWait: "مازال",
    ctaAdjust: "شوف preview beta",
    frequencyLabel: getFrequencyLabel(profile),
    timingLabel: getTimingLabel(profile),
    certainty: delayed ? "soft" : profile.certainty,
    state: delayed ? "delayed" : "pending",
    dueNow: true,
    shouldPrompt: cycleState?.promptedOn !== todayIso,
    meta: profile.certainty === "confident" ? "توقيت واضح" : "توقيت تقريبي",
    statusText: delayed ? "Reminder soft" : "Reminder due",
  };
}

export function getNextRetryDate(profile: SalaryScheduleProfile, today = new Date()): string {
  const days = profile.certainty === "confident" ? 1 : 2;
  return toIsoDate(addDays(startOfDay(today), days));
}

export function applySalaryNotificationAction(
  current: SalaryNotificationState,
  cycleKey: string,
  action: "confirmed" | "delayed",
  profile: SalaryScheduleProfile,
  receivedAmount?: number,
  today = new Date()
): SalaryNotificationState {
  const todayIso = toIsoDate(startOfDay(today));
  return {
    cycles: {
      ...current.cycles,
      [cycleKey]: {
        status: action,
        updatedAt: todayIso,
        promptedOn: todayIso,
        nextRetryOn: action === "delayed" ? getNextRetryDate(profile, today) : undefined,
        receivedAmount:
          action === "confirmed" && typeof receivedAmount === "number"
            ? receivedAmount
            : undefined,
      },
    },
  };
}

export function markSalaryPromptSeen(
  current: SalaryNotificationState,
  cycleKey: string,
  today = new Date()
): SalaryNotificationState {
  const todayIso = toIsoDate(startOfDay(today));
  const previous = current.cycles[cycleKey];
  return {
    cycles: {
      ...current.cycles,
      [cycleKey]: {
        ...(previous ?? { status: "delayed", nextRetryOn: todayIso }),
        updatedAt: previous?.updatedAt ?? todayIso,
        promptedOn: todayIso,
      },
    },
  };
}

export function buildSalaryPreviewScenarios(
  profile: SalaryScheduleProfile | null,
  previewStates: Record<string, "pending" | "confirmed" | "delayed"> = {}
): SalaryNotificationScenario[] {
  const baseProfiles: Array<{ id: string; label: string; profile: SalaryScheduleProfile }> = [
    {
      id: "monthly-fixed",
      label: "Monthly fixed day salary",
      profile:
        profile && profile.frequency === "monthly" && profile.timingMode === "fixed_day"
          ? profile
          : {
              incomeType: "salaried",
              stability: "stable",
              frequency: "monthly",
              timingMode: "fixed_day",
              certainty: "confident",
              fixedDay: 25,
              amount: 6500,
              displayLabel: "كل شهر نهار 25",
            },
    },
    {
      id: "monthly-range",
      label: "Monthly range salary",
      profile:
        profile && profile.frequency === "monthly" && profile.timingMode === "range"
          ? profile
          : {
              incomeType: "salaried",
              stability: "variable",
              frequency: "monthly",
              timingMode: "range",
              certainty: "soft",
              rangeStart: 25,
              rangeEnd: 30,
              rangeLabel: "25-30",
              amount: 6500,
              displayLabel: "كل شهر بين 25 و30",
            },
    },
    {
      id: "weekly",
      label: "Weekly salary",
      profile:
        profile && profile.frequency === "weekly"
          ? profile
          : {
              incomeType: "salaried",
              stability: "stable",
              frequency: "weekly",
              timingMode: "fixed_weekday",
              certainty: "confident",
              fixedWeekday: "fri",
              amount: 1800,
              displayLabel: "كل أسبوع نهار الجمعة",
            },
    },
    {
      id: "biweekly",
      label: "Biweekly salary",
      profile:
        profile && profile.frequency === "biweekly"
          ? profile
          : {
              incomeType: "salaried",
              stability: "stable",
              frequency: "biweekly",
              timingMode: "two_fixed_dates",
              certainty: "confident",
              fixedDates: [1, 15],
              amount: 3200,
              displayLabel: "مرتين فالشهر: 1 و15",
            },
    },
    {
      id: "stable-wording",
      label: "Stable / confident wording",
      profile: {
        incomeType: "salaried",
        stability: "stable",
        frequency: "monthly",
        timingMode: "fixed_day",
        certainty: "confident",
        fixedDay: 28,
        amount: 7000,
        displayLabel: "كل شهر نهار 28",
      },
    },
    {
      id: "variable-wording",
      label: "Variable / soft wording",
      profile: {
        incomeType: "salaried",
        stability: "variable",
        frequency: "monthly",
        timingMode: "range",
        certainty: "soft",
        rangeStart: 1,
        rangeEnd: 5,
        rangeLabel: "1-5",
        amount: 7000,
        displayLabel: "كل شهر بين 1 و5",
      },
    },
  ];

  const scenarios: SalaryNotificationScenario[] = baseProfiles.map(
    ({ id, label, profile: itemProfile }) => {
    const state = previewStates[id] ?? "pending";
    const copy = getSalaryCopy(itemProfile, state === "delayed");
    return {
      id,
      cycleKey: `preview:${id}`,
      title: copy.title,
      description: copy.description,
      ctaConfirm: "توصّلت به",
      ctaWait: "مازال",
      ctaAdjust: "عدّل",
      frequencyLabel: `${label} · ${getFrequencyLabel(itemProfile)}`,
      timingLabel: getTimingLabel(itemProfile),
      certainty: state === "delayed" ? "soft" : itemProfile.certainty,
      state,
      dueNow: true,
      shouldPrompt: true,
      meta: itemProfile.certainty === "confident" ? "Wording confident" : "Wording soft",
      statusText:
        state === "confirmed"
          ? "Confirmed state"
          : state === "delayed"
          ? "Delayed / مازال"
          : "Preview active",
    } satisfies SalaryNotificationScenario;
    }
  );

  const confirmedBase = baseProfiles[0]?.profile;
  const delayedBase = baseProfiles[1]?.profile;
  if (confirmedBase) {
    const copy = getSalaryCopy(confirmedBase, false);
    scenarios.push({
      id: "confirmed-state",
      cycleKey: "preview:confirmed-state",
      title: "تم التأكيد",
      description: "سجلّنا هاد الدفعة فالتجربة beta. ما غاديش نعاودو نذكروك بها فهاد الدورة.",
      ctaConfirm: "توصّلت به",
      ctaWait: "مازال",
      ctaAdjust: "عدّل",
      frequencyLabel: "Confirmed state",
      timingLabel: getTimingLabel(confirmedBase),
      certainty: confirmedBase.certainty,
      state: "confirmed",
      dueNow: false,
      shouldPrompt: false,
      meta: copy.title,
      statusText: "Confirmed state",
    });
  }
  if (delayedBase) {
    const copy = getSalaryCopy(delayedBase, true);
    scenarios.push({
      id: "delayed-state",
      cycleKey: "preview:delayed-state",
      title: copy.title,
      description: copy.description,
      ctaConfirm: "توصّلت به",
      ctaWait: "مازال",
      ctaAdjust: "عدّل",
      frequencyLabel: "Delayed / مازال",
      timingLabel: getTimingLabel(delayedBase),
      certainty: "soft",
      state: "delayed",
      dueNow: true,
      shouldPrompt: true,
      meta: "Reminder retry",
      statusText: "Delayed state",
    });
  }

  return scenarios;
}
