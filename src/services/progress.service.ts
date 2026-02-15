/**
 * Progress Service
 * 
 * Contains business logic for milestone and progress management:
 * - Validating milestone transitions
 * - Updating engagement progress
 * - Tracking progress history
 * - Calculating time spent at milestones
 * - Enforcing progress rules
 */

import { Engagement, IEngagement } from '../models/Engagement.model';
import { ProgressHistory, IProgressHistory } from '../models/ProgressHistory.model';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import { 
  MILESTONES, 
  ALLOWED_MILESTONES, 
  MilestoneType,
  isValidMilestone,
  getMilestoneLabel
} from '../constants/milestones';
import mongoose from 'mongoose';

export interface ProgressUpdateInput {
  engagementId: string;
  newProgress: number;
  adminId: string;
  note?: string;
  isAutomatic?: boolean;
}

export interface ProgressValidationResult {
  isValid: boolean;
  message?: string;
  allowedTransitions?: MilestoneType[];
}

export interface MilestoneTiming {
  milestone: MilestoneType;
  reachedAt: Date;
  timeSpent?: number; // Time until next milestone (seconds)
}

// Define a plain object version of IProgressHistory for lean queries
export interface ProgressHistoryPlain {
  _id: mongoose.Types.ObjectId;
  engagementId: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  updatedByType: 'admin' | 'system';
  fromValue: number;
  toValue: number;
  timeAtMilestone?: number;
  note?: string;
  isAutomatic: boolean;
  previousState?: any;
  metadata?: Record<string, any>; // Plain object instead of Map
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Validate if a progress transition is allowed
 * @param currentProgress - Current milestone value
 * @param newProgress - Requested new milestone value
 * @returns Validation result with allowed transitions
 */
export const validateProgressTransition = (
  currentProgress: MilestoneType,
  newProgress: number
): ProgressValidationResult => {
  
  // Check if new progress is a valid milestone
  if (!isValidMilestone(newProgress)) {
    return {
      isValid: false,
      message: `Invalid milestone value. Allowed values: ${ALLOWED_MILESTONES.join(', ')}`,
    };
  }
  
  const newMilestone = newProgress as MilestoneType;
  
  // Cannot go backwards in progress
  if (newMilestone < currentProgress) {
    return {
      isValid: false,
      message: 'Progress cannot be decreased. Milestones must move forward.',
      allowedTransitions: ALLOWED_MILESTONES.filter(m => m > currentProgress) as MilestoneType[],
    };
  }
  
  // Cannot skip directly to 100% unless at 90%
  if (newMilestone === MILESTONES.COMPLETED && currentProgress !== MILESTONES.FINAL_STAGE) {
    return {
      isValid: false,
      message: 'Cannot skip to 100%. Must reach 90% first.',
      allowedTransitions: [MILESTONES.FINAL_STAGE],
    };
  }
  
  // All other transitions are allowed
  return { isValid: true };
};

/**
 * Calculate time spent at a milestone
 * @param engagementId - Engagement ID
 * @param milestoneValue - Milestone value
 * @returns Time spent in seconds, or undefined if never reached
 */
export const calculateTimeAtMilestone = async (
  engagementId: string,
  milestoneValue: MilestoneType
): Promise<number | undefined> => {
  try {
    // Find when this milestone was reached
    const reachedEntry = await ProgressHistory.findOne({
      engagementId,
      toValue: milestoneValue,
    }).sort({ createdAt: 1 }); // First time it was reached
    
    if (!reachedEntry) {
      return undefined;
    }
    
    // Use type assertion for the entire object to access createdAt
    const reachedEntryAny = reachedEntry as any;
    const reachedDate = reachedEntryAny.createdAt;
    
    // Find when the next milestone was reached
    const nextEntry = await ProgressHistory.findOne({
      engagementId,
      createdAt: { $gt: reachedDate },
      fromValue: milestoneValue,
    }).sort({ createdAt: 1 });
    
    if (!nextEntry) {
      // Still at this milestone - calculate time until now
      const now = new Date();
      const timeDiff = now.getTime() - reachedDate.getTime();
      return Math.floor(timeDiff / 1000); // Convert to seconds
    }
    
    // Use type assertion for the next entry
    const nextEntryAny = nextEntry as any;
    const nextDate = nextEntryAny.createdAt;
    
    // Time between reaching this milestone and moving to next
    const timeDiff = nextDate.getTime() - reachedDate.getTime();
    return Math.floor(timeDiff / 1000);
  } catch (error) {
    logger.error('Error calculating time at milestone:', error);
    return undefined;
  }
};

/**
 * Update engagement progress with validation and history tracking
 * @param input - Progress update input
 * @returns Updated engagement
 */
export const updateProgress = async (
  input: ProgressUpdateInput
): Promise<IEngagement> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { engagementId, newProgress, adminId, note, isAutomatic = false } = input;
    
    // Find engagement
    const engagement = await Engagement.findById(engagementId).session(session);
    
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    const currentProgress = engagement.currentProgress as MilestoneType;
    
    // Validate transition
    const validation = validateProgressTransition(currentProgress, newProgress);
    if (!validation.isValid) {
      throw new ApiError(400, validation.message || 'Invalid progress transition');
    }
    
    const newMilestone = newProgress as MilestoneType;
    
    // Calculate time spent at current milestone
    const timeAtMilestone = await calculateTimeAtMilestone(engagementId, currentProgress);
    
    // Take snapshot of engagement before change (for audit)
    const previousState = engagement.toObject();
    
    // Update engagement progress
    engagement.currentProgress = newMilestone;
    
    // If progress is 100%, handle completion
    if (newMilestone === MILESTONES.COMPLETED && !engagement.isCompleted) {
      engagement.isCompleted = true;
      engagement.completedAt = new Date();
      engagement.messagingAllowed = false; // Disable messaging on completion
    }
    
    await engagement.save({ session });
    
    // Create progress history entry
    const historyEntry = await ProgressHistory.create([{
      engagementId,
      updatedBy: new mongoose.Types.ObjectId(adminId),
      updatedByType: isAutomatic ? 'system' : 'admin',
      fromValue: currentProgress,
      toValue: newMilestone,
      timeAtMilestone,
      note,
      isAutomatic,
      previousState,
    }], { session });
    
    // Add to engagement's progress history array (for quick access)
    engagement.progressHistory.push({
      value: newMilestone,
      updatedAt: new Date(),
      updatedBy: new mongoose.Types.ObjectId(adminId),
      note,
    });
    
    await engagement.save({ session });
    
    await session.commitTransaction();
    
    logger.info(`Progress updated for engagement ${engagementId}: ${currentProgress}% -> ${newMilestone}%`);
    
    return engagement;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get progress history for an engagement
 * @param engagementId - Engagement ID
 * @param limit - Number of entries to return
 * @returns Progress history entries as plain objects
 */
export const getProgressHistory = async (
  engagementId: string,
  limit: number = 50
): Promise<ProgressHistoryPlain[]> => {
  try {
    // FIXED: Use double cast to bypass type safety check
    const history = await ProgressHistory.find({ engagementId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('updatedBy', 'email')
      .lean() as unknown as ProgressHistoryPlain[];
    
    return history;
  } catch (error) {
    logger.error('Error fetching progress history:', error);
    throw new ApiError(500, 'Failed to fetch progress history');
  }
};

/**
 * Get milestone timeline for an engagement
 * @param engagementId - Engagement ID
 * @returns Array of milestones with reach dates and time spent
 */
export const getMilestoneTimeline = async (
  engagementId: string
): Promise<MilestoneTiming[]> => {
  try {
    // FIXED: Use double cast to bypass type safety check
    const history = await ProgressHistory.find({ engagementId })
      .sort({ createdAt: 1 })
      .lean() as unknown as ProgressHistoryPlain[];
    
    const timeline: MilestoneTiming[] = [];
    
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      
      // Access createdAt directly - now it's properly typed in ProgressHistoryPlain
      const entryDate = entry.createdAt;
      
      // Calculate time spent at this milestone
      let timeSpent: number | undefined;
      
      if (i < history.length - 1) {
        const nextEntry = history[i + 1];
        const nextDate = nextEntry.createdAt;
        
        timeSpent = Math.floor(
          (nextDate.getTime() - entryDate.getTime()) / 1000
        );
      } else {
        // Last milestone - calculate until now if not completed
        if (entry.toValue !== MILESTONES.COMPLETED) {
          timeSpent = Math.floor(
            (new Date().getTime() - entryDate.getTime()) / 1000
          );
        }
      }
      
      timeline.push({
        milestone: entry.toValue as MilestoneType,
        reachedAt: entryDate,
        timeSpent,
      });
    }
    
    return timeline;
  } catch (error) {
    logger.error('Error building milestone timeline:', error);
    throw new ApiError(500, 'Failed to build milestone timeline');
  }
};

/**
 * Get progress analytics for dashboard
 * @param engagementId - Engagement ID
 * @returns Progress analytics data
 */
export const getProgressAnalytics = async (
  engagementId: string
): Promise<any> => {
  try {
    const engagement = await Engagement.findById(engagementId);
    
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    // FIXED: Use double cast to bypass type safety check
    const history = await ProgressHistory.find({ engagementId })
      .sort({ createdAt: 1 })
      .lean() as unknown as ProgressHistoryPlain[];
    
    // Calculate total time in progress (if completed)
    let totalDuration: number | undefined;
    if (engagement.isCompleted && engagement.completedAt && engagement.startDate) {
      totalDuration = Math.floor(
        (engagement.completedAt.getTime() - engagement.startDate.getTime()) / 1000
      );
    }
    
    // Calculate average time per milestone
    const milestoneTimes: Record<number, number[]> = {};
    history.forEach((entry, index) => {
      if (index < history.length - 1) {
        const nextEntry = history[index + 1];
        
        const entryDate = entry.createdAt;
        const nextDate = nextEntry.createdAt;
        
        const timeSpent = Math.floor(
          (nextDate.getTime() - entryDate.getTime()) / 1000
        );
        
        if (!milestoneTimes[entry.toValue]) {
          milestoneTimes[entry.toValue] = [];
        }
        milestoneTimes[entry.toValue].push(timeSpent);
      }
    });
    
    const avgTimePerMilestone: Record<string, number> = {};
    Object.entries(milestoneTimes).forEach(([milestone, times]) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      // Cast number to MilestoneType for the label function
      const milestoneValue = Number(milestone) as MilestoneType;
      avgTimePerMilestone[getMilestoneLabel(milestoneValue)] = Math.round(avg);
    });
    
    return {
      currentProgress: engagement.currentProgress,
      isCompleted: engagement.isCompleted,
      completedAt: engagement.completedAt,
      startDate: engagement.startDate,
      totalDuration,
      totalUpdates: history.length,
      averageTimePerMilestone: avgTimePerMilestone,
      timeline: await getMilestoneTimeline(engagementId),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error getting progress analytics:', error);
    throw new ApiError(500, 'Failed to get progress analytics');
  }
};

/**
 * Check for stalled engagements (no progress in X days)
 * @param daysThreshold - Days of inactivity to consider stalled
 * @returns Array of stalled engagement IDs
 */
export const checkStalledEngagements = async (
  daysThreshold: number = 7
): Promise<any[]> => {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
    
    const stalled = await Engagement.aggregate([
      {
        $match: {
          isActive: true,
          isCompleted: false,
          updatedAt: { $lt: thresholdDate },
        },
      },
      {
        $lookup: {
          from: 'progresshistories',
          localField: '_id',
          foreignField: 'engagementId',
          as: 'history',
        },
      },
      {
        $project: {
          engagementId: 1,
          serviceName: 1,
          currentProgress: 1,
          lastUpdate: '$updatedAt',
          totalHistory: { $size: '$history' },
        },
      },
      { $sort: { lastUpdate: 1 } },
    ]);
    
    return stalled;
  } catch (error) {
    logger.error('Error checking stalled engagements:', error);
    throw new ApiError(500, 'Failed to check stalled engagements');
  }
};