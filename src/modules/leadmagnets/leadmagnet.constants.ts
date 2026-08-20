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
 * or change the answer options' values, update QUESTION_TO_CANVAS_AREA and
 * ANSWER_SCALE_VALUES below to match. They must stay in sync.
 *
 * v3 CHANGE LOG (previous 15‑question / 1-10 continuous scale -> current):
 *   - Replaced the question bank with the 15 finalized founder‑diagnostic questions
 *     (IDs q1–q15). All old question IDs (q1, q2, q3, q5, q6, q7, q8, q9, q11,
 *     q12, q14, q17, q19, q20, q22) are retired.
 *   - Answer scale changed from the fixed discrete set {1, 3, 5, 7, 10} to
 *     {0, 1, 4, 7, 10}. 0 is a valid, counted answer meaning "I don't know /
 *     haven't looked into this."
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
// Updated to the 15 new questions (q1–q15).
export const QUESTION_TO_CANVAS_AREA: Record<string, CanvasAreaKey> = {
  q1: 'value_proposition',
  q2: 'customer_relationships',
  q3: 'customer_segments',
  q4: 'key_resources',
  q5: 'key_resources',
  q6: 'value_proposition',
  q7: 'channels',
  q8: 'revenue_streams',
  q9: 'cost_structure',
  q10: 'cost_structure',
  q11: 'key_partners',
  q12: 'key_activities',
  q13: 'key_activities',
  q14: 'key_activities',
  q15: 'cost_structure',
};

export const QUESTION_IDS = Object.keys(QUESTION_TO_CANVAS_AREA) as readonly string[];

// The frontend answer options always use one of these five values per question.
// 0 = "I don't know / haven't looked into this" (valid, counted as lowest).
// 1 / 4 / 7 / 10 are the four other answer tiers (see QUESTIONS array in
// businessHeatMapConfig.tsx).
export const ANSWER_SCALE_VALUES = [0, 1, 4, 7, 10] as const;
export type AnswerScaleValue = (typeof ANSWER_SCALE_VALUES)[number];

export const LEAD_MAGNET_TYPES = ['business_heat_map'] as const;
export type LeadMagnetType = (typeof LEAD_MAGNET_TYPES)[number];