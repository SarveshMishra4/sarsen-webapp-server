/**
 * leadmagnet.constants.ts
 *
 * PURPOSE:
 * Single source of truth for:
 *   1. Which question IDs are valid for the Business Heat Map (used by the validator
 *      to reject payloads with missing/extra/renamed questions).
 *   2. Which canvas area each question belongs to (used by the service to
 *      independently recompute area scores server-side).
 *   3. Which discrete score values are legal answers (used by the validator).
 *
 * WHY WE RECOMPUTE INSTEAD OF TRUSTING THE FRONTEND'S SCORE:
 * The frontend already calculates a result for display purposes (good UX — instant
 * feedback). But anyone can POST directly to this API with a crafted body, bypassing
 * the frontend entirely. If we stored whatever "result" object the client sent, a
 * bad actor could submit fake scores. So the backend only trusts raw per-question
 * answers and recalculates the canvas/area scores itself before saving. This mirrors
 * the frontend's math exactly so the numbers a founder sees on screen match what
 * ends up in the database.
 *
 * IMPORTANT:
 * If you ever add/remove/renumber questions in the frontend's QUESTIONS array,
 * or change the SCALE array's values, update QUESTION_TO_CANVAS_AREA and
 * ANSWER_SCALE_VALUES below to match. They must stay in sync.
 *
 * v2 CHANGE LOG (previous 22-question / 1-10 continuous scale -> current):
 *   - Removed questions: q4, q10, q13, q15, q16, q18, q21 (dropped from frontend's
 *     QUESTIONS array).
 *   - Answer scale changed from any integer 1-10 to the fixed discrete set
 *     {1, 3, 5, 7, 10} (frontend's SCALE array: Critical/Weak/Developing/Healthy/Strong).
 *   - Submission payload now also carries founderName and industry (both required),
 *     and companyName is now required (previously optional).
 */

export const CANVAS_AREA_KEYS = [
  'value_proposition',
  'customer_segments',
  'channels',
  'customer_relationships',
  'revenue_streams',
  'key_resources',
  'key_activities',
  'key_partners',
  'cost_structure',
] as const;

export type CanvasAreaKey = (typeof CANVAS_AREA_KEYS)[number];

// Maps each question id -> the canvas area it scores against.
// Mirrors the `canvasArea` field on each question in the frontend's QUESTIONS array.
// (15 questions as of v2 — q4, q10, q13, q15, q16, q18, q21 were removed.)
export const QUESTION_TO_CANVAS_AREA: Record<string, CanvasAreaKey> = {
  q1: 'customer_segments',
  q2: 'value_proposition',
  q3: 'revenue_streams',
  q5: 'key_resources',
  q6: 'key_activities',
  q7: 'value_proposition',
  q8: 'channels',
  q9: 'customer_relationships',
  q11: 'cost_structure',
  q12: 'cost_structure',
  q14: 'key_activities',
  q17: 'key_partners',
  q19: 'customer_segments',
  q20: 'key_activities',
  q22: 'revenue_streams',
};

export const QUESTION_IDS = Object.keys(QUESTION_TO_CANVAS_AREA) as readonly string[];

// The frontend's SCALE array only ever sends one of these five values per question
// (Critical=1, Weak=3, Developing=5, Healthy=7, Strong=10). Any other integer
// (e.g. 2, 4, 6, 8, 9 from the old continuous slider) is no longer a legal answer.
export const ANSWER_SCALE_VALUES = [1, 3, 5, 7, 10] as const;
export type AnswerScaleValue = (typeof ANSWER_SCALE_VALUES)[number];

export const LEAD_MAGNET_TYPES = ['business_heat_map'] as const;
export type LeadMagnetType = (typeof LEAD_MAGNET_TYPES)[number];