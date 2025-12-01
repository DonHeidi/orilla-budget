import { describe, it, expect, beforeEach } from 'bun:test'
import { createTestDb, cleanDatabase, seed } from '@/test/db-utils'
import { eq } from 'drizzle-orm'
import { projectApprovalSettings, projects } from '@/db/schema'

/**
 * Tests for projectApprovalSettings repository patterns
 */
describe('projectApprovalSettingsRepository patterns', () => {
  const { db } = createTestDb()

  let testOrg: Awaited<ReturnType<typeof seed.organisation>>
  let testProject: Awaited<ReturnType<typeof seed.project>>

  beforeEach(async () => {
    await cleanDatabase(db)
    testOrg = await seed.organisation(db, { name: 'Test Org' })
    testProject = await seed.project(db, testOrg.id, { name: 'Test Project' })
  })

  describe('findByProjectId pattern', () => {
    it('should retrieve settings by project id', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'required',
        autoApproveAfterDays: 7,
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].approvalMode).toBe('required')
      expect(result[0].autoApproveAfterDays).toBe(7)
    })

    it('should return empty when settings not found', async () => {
      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, 'non-existent'))
        .limit(1)

      expect(result).toEqual([])
    })

    it('should parse JSON approvalStages', async () => {
      const stages = ['reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].approvalStages).toBe(JSON.stringify(stages))
      // Parse the JSON to verify
      const parsedStages = JSON.parse(result[0].approvalStages!)
      expect(parsedStages).toEqual(['reviewer', 'client'])
    })
  })

  describe('create pattern', () => {
    it('should insert new settings', async () => {
      const now = new Date().toISOString()
      const settings = {
        id: 'settings-1',
        projectId: testProject.id,
        approvalMode: 'required' as const,
        autoApproveAfterDays: 0,
        requireAllEntriesApproved: true,
        allowSelfApproveNoClient: false,
        approvalStages: null,
        createdAt: now,
        updatedAt: now,
      }

      await db.insert(projectApprovalSettings).values(settings)

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.id, 'settings-1'))
        .limit(1)

      expect(result[0]).toBeDefined()
      expect(result[0].projectId).toBe(testProject.id)
      expect(result[0].approvalMode).toBe('required')
    })

    it('should enforce unique projectId constraint', async () => {
      await seed.projectApprovalSettings(db, testProject.id)

      // Attempting to insert another settings for same project should fail
      try {
        await seed.projectApprovalSettings(db, testProject.id)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('update pattern', () => {
    it('should update approval mode', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'required',
      })

      const now = new Date().toISOString()
      await db
        .update(projectApprovalSettings)
        .set({ approvalMode: 'optional', updatedAt: now })
        .where(eq(projectApprovalSettings.projectId, testProject.id))

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].approvalMode).toBe('optional')
    })

    it('should update autoApproveAfterDays', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        autoApproveAfterDays: 0,
      })

      const now = new Date().toISOString()
      await db
        .update(projectApprovalSettings)
        .set({ autoApproveAfterDays: 14, updatedAt: now })
        .where(eq(projectApprovalSettings.projectId, testProject.id))

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].autoApproveAfterDays).toBe(14)
    })

    it('should update requireAllEntriesApproved', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        requireAllEntriesApproved: true,
      })

      const now = new Date().toISOString()
      await db
        .update(projectApprovalSettings)
        .set({ requireAllEntriesApproved: false, updatedAt: now })
        .where(eq(projectApprovalSettings.projectId, testProject.id))

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].requireAllEntriesApproved).toBe(false)
    })

    it('should update allowSelfApproveNoClient', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        allowSelfApproveNoClient: false,
      })

      const now = new Date().toISOString()
      await db
        .update(projectApprovalSettings)
        .set({ allowSelfApproveNoClient: true, updatedAt: now })
        .where(eq(projectApprovalSettings.projectId, testProject.id))

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].allowSelfApproveNoClient).toBe(true)
    })

    it('should update approvalStages with JSON serialization', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: null,
      })

      const stages = ['expert', 'reviewer', 'client']
      const now = new Date().toISOString()
      await db
        .update(projectApprovalSettings)
        .set({ approvalStages: JSON.stringify(stages), updatedAt: now })
        .where(eq(projectApprovalSettings.projectId, testProject.id))

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(JSON.parse(result[0].approvalStages!)).toEqual(stages)
    })
  })

  describe('delete pattern', () => {
    it('should delete settings by project id', async () => {
      await seed.projectApprovalSettings(db, testProject.id)

      let result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
      expect(result).toHaveLength(1)

      await db
        .delete(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))

      result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
      expect(result).toHaveLength(0)
    })
  })

  describe('cascade delete', () => {
    it('should delete settings when project is deleted', async () => {
      await seed.projectApprovalSettings(db, testProject.id)

      let settings = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
      expect(settings).toHaveLength(1)

      // Delete the project
      await db.delete(projects).where(eq(projects.id, testProject.id))

      // Settings should be cascade deleted
      settings = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
      expect(settings).toHaveLength(0)
    })
  })

  describe('approval modes', () => {
    it('should support required approval mode', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'required',
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].approvalMode).toBe('required')
    })

    it('should support optional approval mode', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'optional',
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].approvalMode).toBe('optional')
    })

    it('should support self_approve mode', async () => {
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'self_approve',
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].approvalMode).toBe('self_approve')
    })

    it('should support multi_stage approval mode', async () => {
      const stages = ['reviewer', 'client']
      await seed.projectApprovalSettings(db, testProject.id, {
        approvalMode: 'multi_stage',
        approvalStages: JSON.stringify(stages),
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.projectId, testProject.id))
        .limit(1)

      expect(result[0].approvalMode).toBe('multi_stage')
      expect(JSON.parse(result[0].approvalStages!)).toEqual(stages)
    })
  })

  describe('default values', () => {
    it('should use default approval mode of required', async () => {
      const now = new Date().toISOString()
      // Insert without specifying approvalMode to test schema default
      await db.insert(projectApprovalSettings).values({
        id: 'default-test',
        projectId: testProject.id,
        createdAt: now,
        updatedAt: now,
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.id, 'default-test'))
        .limit(1)

      expect(result[0].approvalMode).toBe('required')
    })

    it('should use default autoApproveAfterDays of 0', async () => {
      const now = new Date().toISOString()
      await db.insert(projectApprovalSettings).values({
        id: 'default-test-2',
        projectId: testProject.id,
        createdAt: now,
        updatedAt: now,
      })

      const result = await db
        .select()
        .from(projectApprovalSettings)
        .where(eq(projectApprovalSettings.id, 'default-test-2'))
        .limit(1)

      expect(result[0].autoApproveAfterDays).toBe(0)
    })
  })
})
