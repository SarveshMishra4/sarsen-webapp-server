/**
 * Milestone Constants
 * 
 * Defines all possible milestone values for engagement progress tracking.
 * These are the ONLY values that can be set for engagement progress.
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