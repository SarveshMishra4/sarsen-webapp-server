/**
 * leadmagnet.constants.ts
 *
 * PURPOSE:
 * Single source of truth for:
 *   1. Which question IDs are valid for the Business Heat Map (used by the validator
 *      to reject payloads with missing/extra/renamed questions).
 *   2. Which canvas area each question belongs to (used by the service to
 *      independently recompute area scores server-side).
 *
 * WHY WE RECOMPUTE INSTEAD OF TRUSTING THE FRONTEND'S SCORE:
 * The frontend already calculates a result for display purposes (good UX — instant
 * feedback). But anyone can POST directly to this API with a crafted body, bypassing
 * the frontend entirely. If we stored whatever "result" object the client sent, a
 * bad actor could submit fake scores. So the backend only trusts raw per-question
 * answers (1-10 integers) and recalculates the canvas/area scores itself before
 * saving. This mirrors the frontend's math exactly so the numbers a founder sees
 * on screen match what ends up in the database.
 *
 * IMPORTANT:
 * If you ever add/remove/renumber questions in the frontend's QUESTIONS array,
 * update QUESTION_TO_CANVAS_AREA below to match. They must stay in sync.
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
export const QUESTION_TO_CANVAS_AREA: Record<string, CanvasAreaKey> = {
  q1: 'customer_segments',
  q2: 'value_proposition',
  q3: 'revenue_streams',
  q4: 'value_proposition',
  q5: 'key_resources',
  q6: 'key_activities',
  q7: 'value_proposition',
  q8: 'channels',
  q9: 'customer_relationships',
  q10: 'revenue_streams',
  q11: 'cost_structure',
  q12: 'cost_structure',
  q13: 'revenue_streams',
  q14: 'key_activities',
  q15: 'key_activities',
  q16: 'key_resources',
  q17: 'key_partners',
  q18: 'key_resources',
  q19: 'customer_segments',
  q20: 'key_activities',
  q21: 'revenue_streams',
  q22: 'revenue_streams',
};

export const QUESTION_IDS = Object.keys(QUESTION_TO_CANVAS_AREA) as readonly string[];

export const LEAD_MAGNET_TYPES = ['business_heat_map'] as const;
export type LeadMagnetType = (typeof LEAD_MAGNET_TYPES)[number];
