/**
 * Milestone Constants
 * 
 * Defines all possible milestone values for engagement progress tracking.
 * These are the ONLY values that can be set for engagement progress.
 * Also defines transition rules and milestone categories.
 */

export const MILESTONES = {
  // Core milestones
  START: 10,
  EARLY_PROGRESS: 20,
  QUARTER: 25,
  ONE_THIRD: 30,
  MID_PROGRESS: 40,
  HALF: 50,
  ADVANCED: 60,
  NEAR_COMPLETE: 70,
  THREE_QUARTER: 75,
  ALMOST_DONE: 80,
  FINAL_STAGE: 90,
  COMPLETED: 100,
} as const;

// Type for milestone values - can be used as: milestone: MilestoneType
export type MilestoneType = typeof MILESTONES[keyof typeof MILESTONES];

// Array of all milestone values for validation
export const ALLOWED_MILESTONES = Object.values(MILESTONES);

// Default starting milestone for new engagements
export const DEFAULT_STARTING_MILESTONE: MilestoneType = MILESTONES.START;

// PHASE 8: Milestone categories for analytics and grouping
export const MILESTONE_CATEGORIES = {
  EARLY: [MILESTONES.START, MILESTONES.EARLY_PROGRESS, MILESTONES.QUARTER, MILESTONES.ONE_THIRD],
  MID: [MILESTONES.MID_PROGRESS, MILESTONES.HALF, MILESTONES.ADVANCED],
  LATE: [MILESTONES.NEAR_COMPLETE, MILESTONES.THREE_QUARTER, MILESTONES.ALMOST_DONE, MILESTONES.FINAL_STAGE],
  COMPLETION: [MILESTONES.COMPLETED],
} as const;

export type MilestoneCategory = keyof typeof MILESTONE_CATEGORIES;

// PHASE 8: Milestone transition rules
export const MILESTONE_TRANSITIONS: Record<number, MilestoneType[]> = {
  [MILESTONES.START]: [MILESTONES.EARLY_PROGRESS, MILESTONES.QUARTER, MILESTONES.ONE_THIRD],
  [MILESTONES.EARLY_PROGRESS]: [MILESTONES.QUARTER, MILESTONES.ONE_THIRD, MILESTONES.MID_PROGRESS],
  [MILESTONES.QUARTER]: [MILESTONES.ONE_THIRD, MILESTONES.MID_PROGRESS, MILESTONES.HALF],
  [MILESTONES.ONE_THIRD]: [MILESTONES.MID_PROGRESS, MILESTONES.HALF, MILESTONES.ADVANCED],
  [MILESTONES.MID_PROGRESS]: [MILESTONES.HALF, MILESTONES.ADVANCED, MILESTONES.NEAR_COMPLETE],
  [MILESTONES.HALF]: [MILESTONES.ADVANCED, MILESTONES.NEAR_COMPLETE, MILESTONES.THREE_QUARTER],
  [MILESTONES.ADVANCED]: [MILESTONES.NEAR_COMPLETE, MILESTONES.THREE_QUARTER, MILESTONES.ALMOST_DONE],
  [MILESTONES.NEAR_COMPLETE]: [MILESTONES.THREE_QUARTER, MILESTONES.ALMOST_DONE, MILESTONES.FINAL_STAGE],
  [MILESTONES.THREE_QUARTER]: [MILESTONES.ALMOST_DONE, MILESTONES.FINAL_STAGE],
  [MILESTONES.ALMOST_DONE]: [MILESTONES.FINAL_STAGE],
  [MILESTONES.FINAL_STAGE]: [MILESTONES.COMPLETED],
  [MILESTONES.COMPLETED]: [], // No transitions from completed
};

// PHASE 8: Milestone descriptions for tooltips and help text
export const MILESTONE_DESCRIPTIONS: Record<number, string> = {
  [MILESTONES.START]: 'Engagement has been created and initial setup is complete',
  [MILESTONES.EARLY_PROGRESS]: 'Initial discussions and information gathering',
  [MILESTONES.QUARTER]: 'First quarter of the work is complete',
  [MILESTONES.ONE_THIRD]: 'One third of the deliverables are complete',
  [MILESTONES.MID_PROGRESS]: 'Project is progressing well into the middle phase',
  [MILESTONES.HALF]: 'Half of the work is complete',
  [MILESTONES.ADVANCED]: 'Advanced stage - core deliverables are taking shape',
  [MILESTONES.NEAR_COMPLETE]: 'Most work is done, entering final review phase',
  [MILESTONES.THREE_QUARTER]: 'Three quarters of the work is complete',
  [MILESTONES.ALMOST_DONE]: 'Final touches and refinements',
  [MILESTONES.FINAL_STAGE]: 'Final review and approval pending',
  [MILESTONES.COMPLETED]: 'All work completed and delivered',
};

/**
 * Check if a value is a valid milestone
 * @param value - Value to check
 * @returns Boolean indicating if value is a valid milestone
 */
export const isValidMilestone = (value: number): value is MilestoneType => {
  return ALLOWED_MILESTONES.includes(value as MilestoneType);
};

/**
 * Get milestone label for display
 * @param value - Milestone value
 * @returns Human-readable label
 */
export const getMilestoneLabel = (value: MilestoneType): string => {
  switch (value) {
    case MILESTONES.START:
      return 'Engagement Started';
    case MILESTONES.EARLY_PROGRESS:
      return 'Early Progress';
    case MILESTONES.QUARTER:
      return 'Quarter Way';
    case MILESTONES.ONE_THIRD:
      return 'One Third Complete';
    case MILESTONES.MID_PROGRESS:
      return 'Mid Progress';
    case MILESTONES.HALF:
      return 'Halfway There';
    case MILESTONES.ADVANCED:
      return 'Advanced Stage';
    case MILESTONES.NEAR_COMPLETE:
      return 'Near Complete';
    case MILESTONES.THREE_QUARTER:
      return 'Three Quarters';
    case MILESTONES.ALMOST_DONE:
      return 'Almost Done';
    case MILESTONES.FINAL_STAGE:
      return 'Final Stage';
    case MILESTONES.COMPLETED:
      return 'Completed';
    default:
      // This should never happen due to type safety
      return `${value}% Complete`;
  }
};

/**
 * Get milestone category
 * @param value - Milestone value
 * @returns Category of the milestone
 */
export const getMilestoneCategory = (value: MilestoneType): MilestoneCategory => {
  // FIXED: Cast to readonly number[] to avoid type incompatibility
  if ((MILESTONE_CATEGORIES.EARLY as readonly number[]).includes(value)) return 'EARLY';
  if ((MILESTONE_CATEGORIES.MID as readonly number[]).includes(value)) return 'MID';
  if ((MILESTONE_CATEGORIES.LATE as readonly number[]).includes(value)) return 'LATE';
  return 'COMPLETION';
};

/**
 * Get allowed transitions from a milestone
 * @param currentValue - Current milestone value
 * @returns Array of allowed next milestones
 */
export const getAllowedTransitions = (currentValue: MilestoneType): MilestoneType[] => {
  return MILESTONE_TRANSITIONS[currentValue] || [];
};

/**
 * Get milestone description
 * @param value - Milestone value
 * @returns Description of the milestone
 */
export const getMilestoneDescription = (value: MilestoneType): string => {
  return MILESTONE_DESCRIPTIONS[value] || `${value}% complete`;
};

/**
 * Calculate progress percentage for display
 * @param value - Milestone value
 * @returns Progress as a percentage (0-100)
 */
export const getProgressPercentage = (value: MilestoneType): number => {
  return value;
};

/**
 * Check if milestone is a completion milestone
 * @param value - Milestone value
 * @returns Boolean indicating if milestone is completion-related
 */
export const isCompletionMilestone = (value: MilestoneType): boolean => {
  return value === MILESTONES.FINAL_STAGE || value === MILESTONES.COMPLETED;
};

/**
 * Get next recommended milestone
 * @param currentValue - Current milestone value
 * @returns Next recommended milestone or undefined
 */
export const getNextRecommendedMilestone = (currentValue: MilestoneType): MilestoneType | undefined => {
  const allowed = getAllowedTransitions(currentValue);
  if (allowed.length === 0) return undefined;
  
  // Return the smallest allowed milestone (least progress)
  return allowed.reduce((min, val) => (val < min ? val : min), allowed[0]);
};