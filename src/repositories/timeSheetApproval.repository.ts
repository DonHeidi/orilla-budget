import { db, timeSheetApprovals, timeSheets, projectApprovalSettings } from '@/db'
import { eq } from 'drizzle-orm'
import type { TimeSheetApproval, CreateTimeSheetApproval, ApprovalStage } from '@/schemas'
import { generateId } from '@/lib/auth'

export const timeSheetApprovalRepository = {
  /**
   * Find all stage approvals for a time sheet
   */
  async findByTimeSheetId(timeSheetId: string): Promise<TimeSheetApproval[]> {
    return await db
      .select()
      .from(timeSheetApprovals)
      .where(eq(timeSheetApprovals.timeSheetId, timeSheetId))
      .orderBy(timeSheetApprovals.approvedAt)
  },

  /**
   * Create a stage approval record
   */
  async create(
    data: CreateTimeSheetApproval,
    approvedBy: string
  ): Promise<TimeSheetApproval> {
    const now = new Date().toISOString()
    const approval: TimeSheetApproval = {
      id: generateId(),
      timeSheetId: data.timeSheetId,
      stage: data.stage,
      approvedBy,
      approvedAt: now,
      notes: data.notes ?? null,
    }

    await db.insert(timeSheetApprovals).values(approval)
    return approval
  },

  /**
   * Get the next required approval stage for a time sheet
   * Returns null if all stages are complete or if project doesn't use multi-stage
   */
  async getNextRequiredStage(timeSheetId: string): Promise<string | null> {
    // Get the time sheet to find its project
    const sheetResult = await db
      .select({ projectId: timeSheets.projectId })
      .from(timeSheets)
      .where(eq(timeSheets.id, timeSheetId))
      .limit(1)

    if (!sheetResult[0]?.projectId) return null

    // Get the project's approval settings
    const settingsResult = await db
      .select({ approvalStages: projectApprovalSettings.approvalStages })
      .from(projectApprovalSettings)
      .where(eq(projectApprovalSettings.projectId, sheetResult[0].projectId))
      .limit(1)

    if (!settingsResult[0]?.approvalStages) return null

    const stages = JSON.parse(settingsResult[0].approvalStages) as ApprovalStage[]
    if (!stages || stages.length === 0) return null

    // Get existing approvals for this sheet
    const existingApprovals = await this.findByTimeSheetId(timeSheetId)
    const completedStages = new Set(existingApprovals.map((a) => a.stage))

    // Find the first incomplete stage
    for (const stage of stages) {
      if (!completedStages.has(stage)) {
        return stage
      }
    }

    return null // All stages complete
  },

  /**
   * Check if all required approval stages are complete
   */
  async isFullyApproved(timeSheetId: string): Promise<boolean> {
    const nextStage = await this.getNextRequiredStage(timeSheetId)
    return nextStage === null
  },

  /**
   * Get approval status summary for a time sheet
   */
  async getApprovalStatus(timeSheetId: string): Promise<{
    stages: ApprovalStage[]
    completedStages: TimeSheetApproval[]
    nextStage: string | null
    isComplete: boolean
  }> {
    // Get the time sheet to find its project
    const sheetResult = await db
      .select({ projectId: timeSheets.projectId })
      .from(timeSheets)
      .where(eq(timeSheets.id, timeSheetId))
      .limit(1)

    if (!sheetResult[0]?.projectId) {
      return {
        stages: [],
        completedStages: [],
        nextStage: null,
        isComplete: true,
      }
    }

    // Get the project's approval settings
    const settingsResult = await db
      .select({ approvalStages: projectApprovalSettings.approvalStages })
      .from(projectApprovalSettings)
      .where(eq(projectApprovalSettings.projectId, sheetResult[0].projectId))
      .limit(1)

    const stages = settingsResult[0]?.approvalStages
      ? (JSON.parse(settingsResult[0].approvalStages) as ApprovalStage[])
      : []

    const completedStages = await this.findByTimeSheetId(timeSheetId)
    const completedStageNames = new Set(completedStages.map((a) => a.stage))

    let nextStage: string | null = null
    for (const stage of stages) {
      if (!completedStageNames.has(stage)) {
        nextStage = stage
        break
      }
    }

    return {
      stages,
      completedStages,
      nextStage,
      isComplete: nextStage === null,
    }
  },

  /**
   * Delete all approvals for a time sheet (used when reverting to draft)
   */
  async deleteByTimeSheetId(timeSheetId: string): Promise<void> {
    await db
      .delete(timeSheetApprovals)
      .where(eq(timeSheetApprovals.timeSheetId, timeSheetId))
  },
}
