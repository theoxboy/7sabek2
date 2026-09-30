import test from "node:test";
import assert from "node:assert/strict";

import {
  findScreenIndexForQuestionId,
  getOnboardingCardSection,
  groupOnboardingQuestionsIntoCards,
  type CardableQuestion,
} from "./onboardingCards.ts";

const q = (id: string, kind = "single"): CardableQuestion => ({ id, kind, title: id });
const ids = (list: CardableQuestion[]) => list.map((item) => item.id);
const fieldIds = (list: CardableQuestion[], cardId: string) =>
  (list.find((item) => item.id === cardId)?.fields ?? []).map((field) => field.id);

// Same order as buildQuestions for: salaried, couple, renting, one car.
const salariedCoupleRentCar = [
  q("Q0_income_type"),
  q("S1_stability"),
  q("S2a_salary_amount", "input"),
  q("S3_frequency"),
  q("S4_pay_timing_monthly"),
  q("E0_household_type"),
  q("E0_expense_share"),
  q("E6_support_family"),
  q("E3_housing_status"),
  q("RNT0_rent_amount", "input"),
  q("RNT1_rent_includes_costs"),
  q("RNT1a_rent_included_items", "multi"),
  q("E4_transport_mode"),
  q("TRV0_has_multiple_vehicles"),
  q("TR1_car_intro_message", "message"),
  q("TR1_car_fuel_amount", "input"),
  q("TR1_car_insurance_cycle"),
  q("TR1_car_insurance_message", "message"),
  q("TR1_car_insurance_amount", "input"),
  q("TR1_car_maintenance_amount", "input"),
  q("TR1_car_parking"),
  q("TR1_car_parking_amount", "input"),
  q("TR1_car_loan"),
  q("TR1_car_inspection"),
  q("TR1_car_tax"),
  q("FX1_fixed_items", "multi"),
  q("FX2_amount_internet_phone", "input"),
  q("E5_has_debt"),
  q("D1_debt_builder", "debt_builder"),
  q("G1_goal_builder", "goal_builder"),
];

test("one screen per topic for a full salaried profile", () => {
  const screens = groupOnboardingQuestionsIntoCards(salariedCoupleRentCar);
  assert.deepEqual(ids(screens), [
    "Q0_income_type",
    "card_income",
    "card_household",
    "card_housing",
    "card_transport",
    "card_vehicle_TR1_",
    "card_fixed",
    "E5_has_debt",
    "D1_debt_builder",
    "G1_goal_builder",
  ]);
});

test("every question keeps its place inside its card, in order", () => {
  const screens = groupOnboardingQuestionsIntoCards(salariedCoupleRentCar);
  assert.deepEqual(fieldIds(screens, "card_income"), [
    "S1_stability",
    "S2a_salary_amount",
    "S3_frequency",
    "S4_pay_timing_monthly",
  ]);
  assert.deepEqual(fieldIds(screens, "card_transport"), ["E4_transport_mode", "TRV0_has_multiple_vehicles"]);
  assert.deepEqual(fieldIds(screens, "card_fixed"), ["FX1_fixed_items", "FX2_amount_internet_phone"]);
});

test("no answer key is lost: only vehicle messages leave the list", () => {
  const screens = groupOnboardingQuestionsIntoCards(salariedCoupleRentCar);
  const shown = screens.flatMap((screen) => (screen.kind === "group" ? ids(screen.fields ?? []) : [screen.id]));
  const expected = ids(salariedCoupleRentCar).filter((id) => !id.endsWith("_message"));
  assert.deepEqual(shown, expected);
});

test("a card id stays the same while follow-up fields appear", () => {
  const before = groupOnboardingQuestionsIntoCards([q("Q0_income_type"), q("E3_housing_status"), q("E4_transport_mode")]);
  const after = groupOnboardingQuestionsIntoCards([
    q("Q0_income_type"),
    q("E3_housing_status"),
    q("RNT0_rent_amount", "input"),
    q("E4_transport_mode"),
  ]);
  assert.deepEqual(ids(before), ids(after));
  assert.equal(findScreenIndexForQuestionId(after, "card_housing"), 1);
});

test("each vehicle gets its own numbered card", () => {
  const screens = groupOnboardingQuestionsIntoCards([
    q("E4_transport_mode"),
    q("TRV0_has_multiple_vehicles"),
    q("TRV1_vehicle_count"),
    q("TRV1_vehicle_intro_message", "message"),
    q("TRV1_car_intro_message", "message"),
    q("TRV1_car_fuel_amount", "input"),
    q("TRV2_vehicle_intro_message", "message"),
    q("TRV2_car_fuel_amount", "input"),
  ]);
  assert.deepEqual(ids(screens), ["card_transport", "card_vehicle_TRV1_", "card_vehicle_TRV2_"]);
  assert.deepEqual(fieldIds(screens, "card_transport"), [
    "E4_transport_mode",
    "TRV0_has_multiple_vehicles",
    "TRV1_vehicle_count",
  ]);
  assert.equal(screens[1].title, "الطوموبيل #1");
  assert.equal(screens[2].title, "الطوموبيل #2");
});

test("screens that need their own layout are never put in a card", () => {
  const screens = groupOnboardingQuestionsIntoCards([
    q("Q0_income_type"),
    q("H2_collection_cycle"),
    q("H3_income_profile", "income_variation"),
    q("E0_household_type"),
  ]);
  assert.deepEqual(ids(screens), ["Q0_income_type", "card_income", "H3_income_profile", "card_household"]);
});

test("old links and saved progress find the card of a grouped question", () => {
  const screens = groupOnboardingQuestionsIntoCards(salariedCoupleRentCar);
  assert.equal(findScreenIndexForQuestionId(screens, "S2a_salary_amount"), 1);
  assert.equal(findScreenIndexForQuestionId(screens, "TR1_car_parking_amount"), 5);
  assert.equal(findScreenIndexForQuestionId(screens, "E5_has_debt"), 7);
  assert.equal(findScreenIndexForQuestionId(screens, "S4a_fixed_day"), -1);
});

test("card ids map to their onboarding section", () => {
  assert.equal(getOnboardingCardSection("card_income"), "income");
  assert.equal(getOnboardingCardSection("card_vehicle_TRV2_"), "transport");
  assert.equal(getOnboardingCardSection("card_fixed"), "fixed");
  assert.equal(getOnboardingCardSection("E5_has_debt"), null);
});
