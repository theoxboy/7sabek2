/**
 * Onboarding cards: a presentation layer over the question list.
 *
 * buildQuestions still produces one question per answer key, with its own
 * conditions. This module only decides which consecutive questions share a
 * screen ("card"). Answer keys, validation and the backend are untouched, so
 * a card id never needs to be understood by anything but the UI.
 */

export type OnboardingCardSection = "income" | "household" | "housing" | "transport" | "fixed";

export type CardableQuestion = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  fields?: CardableQuestion[];
  section?: string;
};

type CardDefinition = {
  key: string;
  section: OnboardingCardSection;
  title: string;
  match: RegExp;
};

export const ONBOARDING_CARD_DEFINITIONS: CardDefinition[] = [
  {
    key: "income",
    section: "income",
    title: "الدخل ديالك",
    match:
      /^(S1_stability|S2a_salary_amount|S3_frequency|S4_pay_timing_|F1_payment_mode|F1b_collection_cycle|F2_retainer_stability|F3_retainer_pay_timing|F7_min_income|M1_combo|M2_primary_cycle|M2_pay_timing_|M3_min_income|H2_collection_cycle)/,
  },
  {
    key: "household",
    section: "household",
    title: "العائلة",
    match:
      /^(E0_household_type|E0_expense_share|E2_kids_count|E0f_school_costs|E0f_school_payment_cycle|E6_support_family|E6a_support_family_amount|E6b_support_family_cadence)$/,
  },
  {
    key: "housing",
    section: "housing",
    title: "السكن",
    match:
      /^(E3_housing_status|RNT0_rent_amount|RNT1_rent_includes_costs|RNT1a_rent_included_items|HSN1_loan_monthly_amount|HSN3_owner_fixed_items|HSN5_with_family_contribution|HSN5a_with_family_amount)$/,
  },
  {
    key: "transport",
    section: "transport",
    title: "التنقل",
    match:
      /^(E4_transport_mode|TRV0_has_multiple_vehicles|TRV1_vehicle_count|TRX1_primary_mode|TRX2_total_monthly_amount|TRX3_detail_mode|TRX4_equal_detail_target|TRP1_|TRX_P_)/,
  },
  {
    key: "fixed",
    section: "fixed",
    title: "المصاريف الثابتة الأخرى",
    match: /^(FX1_fixed_items|FX2_amount_)/,
  },
];

const VEHICLE_FIELD_PATTERN = /^(TR1_|TRM1_|TRV\d+_|TRX_C_|TRX_B_)(car|bike)_/;
const VEHICLE_INTRO_PATTERN = /^TRV\d+_vehicle_intro_message$/;
const VEHICLE_CARD_SUBTITLE = "عمّر غير اللي كتخلص. اللي ما كاينش، اختار لا.";

function resolveCard(
  questionId: string
): { key: string; title: string; subtitle?: string; section: OnboardingCardSection } | null {
  const vehicleMatch = questionId.match(VEHICLE_FIELD_PATTERN);
  if (vehicleMatch) {
    const prefix = vehicleMatch[1];
    const vehicleIndex = prefix.match(/^TRV(\d+)_$/)?.[1];
    const vehicleLabel = vehicleMatch[2] === "car" ? "الطوموبيل" : "الموتور";
    return {
      key: `vehicle_${prefix}`,
      title: vehicleIndex ? `${vehicleLabel} #${vehicleIndex}` : vehicleLabel,
      subtitle: VEHICLE_CARD_SUBTITLE,
      section: "transport",
    };
  }
  const definition = ONBOARDING_CARD_DEFINITIONS.find((entry) => entry.match.test(questionId));
  return definition
    ? { key: definition.key, title: definition.title, section: definition.section }
    : null;
}

/**
 * Groups consecutive questions of one topic into a "group" question whose
 * `fields` are the original questions, in order. Messages inside a vehicle
 * card are dropped (the card title/subtitle carries them). Questions outside
 * any card are returned unchanged. A card id only depends on its topic, so it
 * stays stable while follow-up fields appear or disappear.
 */
export function groupOnboardingQuestionsIntoCards<T extends CardableQuestion>(questions: T[]): T[] {
  const result: T[] = [];
  let openCardKey: string | null = null;
  let openCard: T | null = null;

  questions.forEach((question) => {
    if (VEHICLE_INTRO_PATTERN.test(question.id)) return;

    const card = resolveCard(question.id);
    if (!card) {
      openCardKey = null;
      openCard = null;
      result.push(question);
      return;
    }
    if (question.kind === "message") return;

    if (openCard !== null && openCardKey === card.key) {
      const current: T = openCard;
      current.fields = [...(current.fields ?? []), question];
      return;
    }
    openCardKey = card.key;
    openCard = {
      id: `card_${card.key}`,
      title: card.title,
      subtitle: card.subtitle,
      kind: "group",
      section: card.section,
      fields: [question],
    } as unknown as T;
    result.push(openCard);
  });

  return result;
}

/** Section of a card id, or null when the id is not a card. */
export function getOnboardingCardSection(questionId: string): OnboardingCardSection | null {
  if (questionId.startsWith("card_vehicle_")) return "transport";
  if (!questionId.startsWith("card_")) return null;
  const definition = ONBOARDING_CARD_DEFINITIONS.find((entry) => `card_${entry.key}` === questionId);
  return definition ? definition.section : null;
}

/** Index of the screen showing `questionId`, either directly or as a card field. */
export function findScreenIndexForQuestionId(questions: CardableQuestion[], questionId: string): number {
  const directIndex = questions.findIndex((question) => question.id === questionId);
  if (directIndex >= 0) return directIndex;
  return questions.findIndex((question) => (question.fields ?? []).some((field) => field.id === questionId));
}
