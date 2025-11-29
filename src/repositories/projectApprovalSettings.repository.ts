import { db, projectApprovalSettings } from '@/db'
import { eq } from 'drizzle-orm'
import type {
  ProjectApprovalSettings,
  UpdateProjectApprovalSettings,
  ApprovalStage,
} from '@/schemas'
import { generateId } from '@/lib/auth'

export const projectApprovalSettingsRepository = {
  /**
   * Find approval settings for a project
   */
  async findByProjectId(
    projectId: string
  ): Promise<ProjectApprovalSettings | undefined> {
    const result = await db
      .select()
      .from(projectApprovalSettings)
      .where(eq(projectApprovalSettings.projectId, projectId))
      .limit(1)

    if (!result[0]) return undefined

    // Parse approvalStages from JSON string
    const settings = result[0]
    return {
      ...settings,
      approvalStages: settings.approvalStages
        ? (JSON.parse(settings.approvalStages) as ApprovalStage[])
        : null,
    } as ProjectApprovalSettings
  },

  /**
   * Get or create approval settings for a project
   * Returns existing settings or creates default settings
   */
  async getOrCreateForProject(
    projectId: string
  ): Promise<ProjectApprovalSettings> {
    const existing = await this.findByProjectId(projectId)
    if (existing) return existing

    const now = new Date().toISOString()
    const settings: ProjectApprovalSettings = {
      id: generateId(),
      projectId,
      approvalMode: 'required',
      autoApproveAfterDays: 0,
      requireAllEntriesApproved: true,
      allowSelfApproveNoClient: false,
      approvalStages: null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(projectApprovalSettings).values({
      ...settings,
      approvalStages: settings.approvalStages
        ? JSON.stringify(settings.approvalStages)
        : null,
    })

    return settings
  },

  /**
   * Update approval settings for a project
   */
  async update(
    projectId: string,
    data: UpdateProjectApprovalSettings
  ): Promise<void> {
    // Ensure settings exist
    await this.getOrCreateForProject(projectId)

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: now,
    }

    // Serialize approvalStages to JSON if provided
    if (data.approvalStages !== undefined) {
      updateData.approvalStages = data.approvalStages
        ? JSON.stringify(data.approvalStages)
        : null
    }

    await db
      .update(projectApprovalSettings)
      .set(updateData)
      .where(eq(projectApprovalSettings.projectId, projectId))
  },

  /**
   * Delete approval settings for a project
   */
  async delete(projectId: string): Promise<void> {
    await db
      .delete(projectApprovalSettings)
      .where(eq(projectApprovalSettings.projectId, projectId))
  },
}
