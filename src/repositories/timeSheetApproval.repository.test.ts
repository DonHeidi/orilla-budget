import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import { eq } from 'drizzle-orm'
import {
  timeSheetApprovals,
  timeSheets,
  projectApprovalSettings,
  users,
} from '@/db/schema'

/**
 * Tests for timeSheetApproval repository patterns
 */
describe('timeSheetApprovalRepository patterns', () => {
  const { db } = createTestDb()

  let testUser: Awaited<ReturnType<typeof seed.user>>
  let testOrg: Awaited<ReturnType<typeof seed.organisation>>
  let testProject: Awaited<ReturnType<typeof seed.project>>
  let testSheet: Awaited<ReturnType<typeof seed.timeSheet>>

  beforeEach(async () => {
    await cleanDatabase(db)
    testUser = await seed.user(db, { handle: 'approver', email: 'approver@test.com' })
    testOrg = await seed.organisation(db, { name: 'Test Org' })
    testProject = await seed.project(db, testOrg.id, { name: 'Test Project' })
    testSheet = await seed.timeSheet(db, {
      title: 'Test Sheet',
      projectId: testProject.id,
      status: 'submitted',
    })
  })

  describe('findByTimeSheetId pattern', () => {
    it('should retrieve all approvals for a time sheet', async () => {
      const user2 = await seed.user(db, { handle: 'reviewer', email: 'reviewer@test.com' })

      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'expert' })
      await seed.timeSheetApproval(db, testSheet.id, user2.id, { stage: 'reviewer' })

      const results = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      expect(results).toHaveLength(2)
      expect(results.map((a) => a.stage)).toContain('expert')
      expect(results.map((a) => a.stage)).toContain('reviewer')
    })

    it('should return empty array when no approvals exist', async () => {
      const results = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      expect(results).toEqual([])
    })

    it('should order approvals by approvedAt', async () => {
      const date1 = new Date('2024-01-01').toISOString()
      const date2 = new Date('2024-01-02').toISOString()
      const date3 = new Date('2024-01-03').toISOString()

      await seed.timeSheetApproval(db, testSheet.id, testUser.id, {
        stage: 'second',
        approvedAt: date2,
      })
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, {
        stage: 'first',
        approvedAt: date1,
      })
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, {
        stage: 'third',
        approvedAt: date3,
      })

      const results = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))
        .orderBy(timeSheetApprovals.approvedAt)

      expect(results[0].stage).toBe('first')
      expect(results[1].stage).toBe('second')
      expect(results[2].stage).toBe('third')
    })
  })

  describe('create pattern', () => {
    it('should insert new approval record', async () => {
      const now = new Date().toISOString()
      const approval = {
        id: 'approval-1',
        timeSheetId: testSheet.id,
        stage: 'reviewer',
        approvedBy: testUser.id,
        approvedAt: now,
        notes: null,
      }

      await db.insert(timeSheetApprovals).values(approval)

      const result = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.id, 'approval-1'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].timeSheetId).toBe(testSheet.id)
      expect(result[0].stage).toBe('reviewer')
      expect(result[0].approvedBy).toBe(testUser.id)
    })

    it('should support approval with notes', async () => {
      const now = new Date().toISOString()
      const approval = {
        id: 'approval-2',
        timeSheetId: testSheet.id,
        stage: 'client',
        approvedBy: testUser.id,
        approvedAt: now,
        notes: 'Approved with minor adjustments',
      }

      await db.insert(timeSheetApprovals).values(approval)

      const result = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.id, 'approval-2'))
        .limit(1)

      expect(result[0].notes).toBe('Approved with minor adjustments')
    })
  })

  describe('getNextRequiredStage pattern', () => {
    it('should return null when project has no multi-stage approval', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'required',
        approvalStages: null,
      })

      const settings = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(settings[0].approvalStages).toBeNull()
    })

    it('should return first stage when no approvals exist', async () => {
      const stages = ['reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      const settings = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      const parsedStages = JSON.parse(settings[0].approvalStages!) as string[]
      const approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      const completedStages = new Set(approvals.map((a) => a.stage))

      // Find first incomplete stage
      let nextStage: string | null = null
      for (const stage of parsedStages) {
        if (!completedStages.has(stage)) {
          nextStage = stage
          break
        }
      }

      expect(nextStage).toBe('reviewer')
    })

    it('should return next uncompleted stage', async () => {
      const stages = ['expert', 'reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      // Complete first two stages
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'expert' })
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'reviewer' })

      const approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      const completedStages = new Set(approvals.map((a) => a.stage))

      // Find next incomplete stage
      let nextStage: string | null = null
      for (const stage of stages) {
        if (!completedStages.has(stage)) {
          nextStage = stage
          break
        }
      }

      expect(nextStage).toBe('client')
    })

    it('should return null when all stages complete', async () => {
      const stages = ['reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      // Complete all stages
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'reviewer' })
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'client' })

      const approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      const completedStages = new Set(approvals.map((a) => a.stage))

      // Find next incomplete stage
      let nextStage: string | null = null
      for (const stage of stages) {
        if (!completedStages.has(stage)) {
          nextStage = stage
          break
        }
      }

      expect(nextStage).toBeNull()
    })
  })

  describe('isFullyApproved pattern', () => {
    it('should return true when all required stages are approved', async () => {
      const stages = ['reviewer']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'reviewer' })

      const approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      const completedStages = new Set(approvals.map((a) => a.stage))
      const allComplete = stages.every((stage) => completedStages.has(stage))

      expect(allComplete).toBe(true)
    })

    it('should return false when some stages are pending', async () => {
      const stages = ['reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'reviewer' })

      const approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      const completedStages = new Set(approvals.map((a) => a.stage))
      const allComplete = stages.every((stage) => completedStages.has(stage))

      expect(allComplete).toBe(false)
    })

    it('should return true when no multi-stage approval configured', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'required',
        approvalStages: null,
      })

      const settings = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      // No stages configured = considered complete for multi-stage purposes
      expect(settings[0].approvalStages).toBeNull()
    })
  })

  describe('getApprovalStatus pattern', () => {
    it('should return complete status summary', async () => {
      const stages = ['expert', 'reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'expert' })

      const settings = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      const parsedStages = JSON.parse(settings[0].approvalStages!) as string[]

      const completedApprovals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      const completedStageNames = new Set(completedApprovals.map((a) => a.stage))

      let nextStage: string | null = null
      for (const stage of parsedStages) {
        if (!completedStageNames.has(stage)) {
          nextStage = stage
          break
        }
      }

      const status = {
        stages: parsedStages,
        completedStages: completedApprovals,
        nextStage,
        isComplete: nextStage === null,
      }

      expect(status.stages).toEqual(['expert', 'reviewer', 'client'])
      expect(status.completedStages).toHaveLength(1)
      expect(status.nextStage).toBe('reviewer')
      expect(status.isComplete).toBe(false)
    })
  })

  describe('deleteByTimeSheetId pattern', () => {
    it('should delete all approvals for a time sheet', async () => {
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'expert' })
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'reviewer' })

      let approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))
      expect(approvals).toHaveLength(2)

      await db
        .delete(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))
      expect(approvals).toHaveLength(0)
    })
  })

  describe('cascade delete', () => {
    it('should delete approvals when time sheet is deleted', async () => {
      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'reviewer' })

      let approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))
      expect(approvals).toHaveLength(1)

      // Delete the time sheet
      await db.delete(timeSheets).where(eq(timeSheets.id, testSheet.id))

      // Approvals should be cascade deleted
      approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))
      expect(approvals).toHaveLength(0)
    })

    it('should delete approvals when approver user is deleted', async () => {
      const approver = await seed.user(db, {
        handle: 'tempapprover',
        email: 'temp@test.com',
      })
      await seed.timeSheetApproval(db, testSheet.id, approver.id, { stage: 'reviewer' })

      let approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.approvedBy, approver.id))
      expect(approvals).toHaveLength(1)

      // Delete the approver user
      await db.delete(users).where(eq(users.id, approver.id))

      // Approvals should be cascade deleted
      approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.approvedBy, approver.id))
      expect(approvals).toHaveLength(0)
    })
  })

  describe('multi-stage workflow', () => {
    it('should track sequential stage completion', async () => {
      const stages = ['expert', 'reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      // Complete stages sequentially
      const expert = await seed.user(db, { handle: 'expert', email: 'expert@test.com' })
      const reviewer = await seed.user(db, {
        handle: 'reviewer',
        email: 'reviewer@test.com',
      })
      const client = await seed.user(db, { handle: 'client', email: 'client@test.com' })

      await seed.timeSheetApproval(db, testSheet.id, expert.id, {
        stage: 'expert',
        approvedAt: new Date('2024-01-01').toISOString(),
      })
      await seed.timeSheetApproval(db, testSheet.id, reviewer.id, {
        stage: 'reviewer',
        approvedAt: new Date('2024-01-02').toISOString(),
      })
      await seed.timeSheetApproval(db, testSheet.id, client.id, {
        stage: 'client',
        approvedAt: new Date('2024-01-03').toISOString(),
      })

      const approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))
        .orderBy(timeSheetApprovals.approvedAt)

      expect(approvals).toHaveLength(3)
      expect(approvals[0].stage).toBe('expert')
      expect(approvals[1].stage).toBe('reviewer')
      expect(approvals[2].stage).toBe('client')
    })

    it('should allow different users to approve different stages', async () => {
      const user2 = await seed.user(db, { handle: 'user2', email: 'user2@test.com' })

      await seed.timeSheetApproval(db, testSheet.id, testUser.id, { stage: 'expert' })
      await seed.timeSheetApproval(db, testSheet.id, user2.id, { stage: 'reviewer' })

      const approvals = await db
        .select()
        .from(timeSheetApprovals)
        .where(eq(timeSheetApprovals.timeSheetId, testSheet.id))

      const expertApproval = approvals.find((a) => a.stage === 'expert')
      const reviewerApproval = approvals.find((a) => a.stage === 'reviewer')

      expect(expertApproval?.approvedBy).toBe(testUser.id)
      expect(reviewerApproval?.approvedBy).toBe(user2.id)
    })
  })
})
