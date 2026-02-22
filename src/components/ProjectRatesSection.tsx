import React, { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import {
  DollarSign,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Archive,
  Users,
} from 'lucide-react'

import { z } from 'zod'

import {
  projectBillingRoleRepository,
  type ProjectBillingRole,
} from '@/repositories/projectBillingRole.repository'
import {
  projectRateRepository,
  type ProjectRate,
} from '@/repositories/projectRate.repository'
import {
  projectMemberBillingRoleRepository,
  type MemberBillingDetails,
} from '@/repositories/projectMemberBillingRole.repository'
import { projectRepository } from '@/repositories/project.repository'
import { getCurrentUser } from '@/repositories/auth.repository'
import {
  createProjectBillingRoleSchema,
  updateProjectBillingRoleSchema,
  createProjectRateSchema,
} from '@/schemas'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ============================================================================
// Server Functions
// ============================================================================

const getBillingDataFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    const [billingRoles, activeRates, memberDetails] = await Promise.all([
      projectBillingRoleRepository.findByProjectId(data.projectId),
      projectRateRepository.findActiveByProjectId(data.projectId),
      projectMemberBillingRoleRepository.findByProjectIdWithDetails(data.projectId),
    ])
    return { billingRoles, activeRates, memberDetails }
  })

const createBillingRoleFn = createServerFn({ method: 'POST' })
  .inputValidator(createProjectBillingRoleSchema)
  .handler(async ({ data }) => {
    return projectBillingRoleRepository.create(data)
  })

const updateBillingRoleFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), updates: updateProjectBillingRoleSchema }))
  .handler(async ({ data }) => {
    return projectBillingRoleRepository.update(data.id, data.updates)
  })

const archiveBillingRoleFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    return projectBillingRoleRepository.archive(data.id)
  })

const setRateFn = createServerFn({ method: 'POST' })
  .inputValidator(createProjectRateSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')
    return projectRateRepository.setRate({ ...data, createdBy: user.id })
  })

const setMemberBillingRoleFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ teamMemberId: z.string(), billingRoleId: z.string().nullable() }))
  .handler(async ({ data }) => {
    return projectMemberBillingRoleRepository.setMemberBillingRole(
      data.teamMemberId,
      data.billingRoleId
    )
  })

const updateProjectDefaultsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      fixedPrice: z.number().positive().nullable().optional(),
      defaultHourlyRate: z.number().positive().nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    return projectRepository.update(data.id, {
      fixedPrice: data.fixedPrice,
      defaultHourlyRate: data.defaultHourlyRate,
    })
  })

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function formatDollars(dollars: number | null | undefined): string {
  if (dollars === null || dollars === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

function centsToDollars(cents: number): number {
  return cents / 100
}

// ============================================================================
// Types
// ============================================================================

interface ProjectRatesSectionProps {
  projectId: string
  teamId: string
  category: 'budget' | 'fixed'
  fixedPrice: number | null
  defaultHourlyRate: number | null
  canEdit: boolean
}

// ============================================================================
// Component
// ============================================================================

export function ProjectRatesSection({
  projectId,
  teamId,
  category,
  fixedPrice,
  defaultHourlyRate,
  canEdit,
}: ProjectRatesSectionProps) {
  const router = useRouter()

  // Wrap server functions with useServerFn for proper client-server boundary
  const getBillingData = useServerFn(getBillingDataFn)
  const createBillingRole = useServerFn(createBillingRoleFn)
  const updateBillingRole = useServerFn(updateBillingRoleFn)
  const archiveBillingRole = useServerFn(archiveBillingRoleFn)
  const setRate = useServerFn(setRateFn)
  const setMemberBillingRole = useServerFn(setMemberBillingRoleFn)
  const updateProjectDefaults = useServerFn(updateProjectDefaultsFn)

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [billingData, setBillingData] = useState<{
    billingRoles: ProjectBillingRole[]
    activeRates: ProjectRate[]
    memberDetails: MemberBillingDetails[]
  } | null>(null)

  // Dialog states
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<ProjectBillingRole | null>(null)
  const [editingDefaultRate, setEditingDefaultRate] = useState(false)
  const [editingFixedPrice, setEditingFixedPrice] = useState(false)

  // Form states
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [newRoleRate, setNewRoleRate] = useState('')
  const [editedDefaultRate, setEditedDefaultRate] = useState('')
  const [editedFixedPrice, setEditedFixedPrice] = useState('')

  const handleToggle = async () => {
    if (!isOpen && !billingData) {
      setLoading(true)
      try {
        const data = await getBillingData({ data: { projectId: teamId } })
        setBillingData(data)
      } catch (error) {
        console.error('Failed to load billing data:', error)
      } finally {
        setLoading(false)
      }
    }
    setIsOpen(!isOpen)
  }

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return

    try {
      const role = await createBillingRole({
        data: {
          projectId: teamId,
          name: newRoleName.trim(),
          description: newRoleDescription.trim(),
        },
      })

      // If a rate was specified, create the rate record
      if (newRoleRate && parseFloat(newRoleRate) > 0) {
        const today = new Date().toISOString().split('T')[0]!
        await setRate({
          data: {
            projectId: teamId,
            rateType: 'billing_role' as const,
            billingRoleId: role.id,
            rateAmountCents: dollarsToCents(parseFloat(newRoleRate)),
            effectiveFrom: today,
          },
        })
      }

      // Refresh data
      const data = await getBillingData({ data: { projectId: teamId } })
      setBillingData(data)

      // Reset form
      setNewRoleName('')
      setNewRoleDescription('')
      setNewRoleRate('')
      setShowAddRoleDialog(false)
    } catch (error) {
      console.error('Failed to create billing role:', error)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingRole || !newRoleName.trim()) return

    try {
      await updateBillingRole({
        data: {
          id: editingRole.id,
          updates: {
            name: newRoleName.trim(),
            description: newRoleDescription.trim(),
          },
        },
      })

      // Update rate if changed
      if (newRoleRate && parseFloat(newRoleRate) > 0) {
        const today = new Date().toISOString().split('T')[0]!
        await setRate({
          data: {
            projectId: teamId,
            rateType: 'billing_role' as const,
            billingRoleId: editingRole.id,
            rateAmountCents: dollarsToCents(parseFloat(newRoleRate)),
            effectiveFrom: today,
          },
        })
      }

      // Refresh data
      const data = await getBillingData({ data: { projectId: teamId } })
      setBillingData(data)

      // Reset form
      setEditingRole(null)
      setNewRoleName('')
      setNewRoleDescription('')
      setNewRoleRate('')
    } catch (error) {
      console.error('Failed to update billing role:', error)
    }
  }

  const handleArchiveRole = async (roleId: string) => {
    try {
      await archiveBillingRole({ data: { id: roleId } })
      const data = await getBillingData({ data: { projectId: teamId } })
      setBillingData(data)
    } catch (error) {
      console.error('Failed to archive billing role:', error)
    }
  }

  const handleUpdateDefaultRate = async () => {
    const rate = parseFloat(editedDefaultRate)
    if (isNaN(rate) || rate <= 0) return

    try {
      const today = new Date().toISOString().split('T')[0]!
      await setRate({
        data: {
          projectId: teamId,
          rateType: 'default' as const,
          rateAmountCents: dollarsToCents(rate),
          effectiveFrom: today,
        },
      })

      // Also update the project's defaultHourlyRate for display
      await updateProjectDefaults({
        data: { id: projectId, defaultHourlyRate: rate },
      })

      const data = await getBillingData({ data: { projectId: teamId } })
      setBillingData(data)
      setEditingDefaultRate(false)
      router.invalidate()
    } catch (error) {
      console.error('Failed to update default rate:', error)
    }
  }

  const handleUpdateFixedPrice = async () => {
    const price = parseFloat(editedFixedPrice)
    if (isNaN(price) || price <= 0) return

    try {
      await updateProjectDefaults({
        data: { id: projectId, fixedPrice: price },
      })
      setEditingFixedPrice(false)
      router.invalidate()
    } catch (error) {
      console.error('Failed to update fixed price:', error)
    }
  }

  const handleMemberRoleChange = async (teamMemberId: string, billingRoleId: string | null) => {
    try {
      await setMemberBillingRole({
        data: { teamMemberId, billingRoleId },
      })
      const data = await getBillingData({ data: { projectId: teamId } })
      setBillingData(data)
    } catch (error) {
      console.error('Failed to update member billing role:', error)
    }
  }

  const openEditRoleDialog = (role: ProjectBillingRole) => {
    setEditingRole(role)
    setNewRoleName(role.name)
    setNewRoleDescription(role.description || '')
    // Find the current rate for this role
    const currentRate = billingData?.activeRates.find(
      (r) => r.rateType === 'billing_role' && r.billingRoleId === role.id
    )
    setNewRoleRate(currentRate ? centsToDollars(currentRate.rateAmountCents).toString() : '')
  }

  // Get the default rate from active rates
  const currentDefaultRate = billingData?.activeRates.find((r) => r.rateType === 'default')

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-between w-full text-left py-2"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-display text-sm tracking-wider uppercase text-muted-foreground">
            Rates & Billing
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 pl-6 space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              {/* Project Defaults Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Project Defaults
                </h4>

                {/* Fixed Price (for fixed-price projects) */}
                {category === 'fixed' && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Fixed Price</p>
                      <p className="text-xs text-muted-foreground">
                        Total project contract value
                      </p>
                    </div>
                    {editingFixedPrice ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editedFixedPrice}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedFixedPrice(e.target.value)}
                          className="w-28 h-8"
                          placeholder="0.00"
                        />
                        <Button size="sm" variant="outline" onClick={() => setEditingFixedPrice(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleUpdateFixedPrice}>
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatDollars(fixedPrice)}
                        </span>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditedFixedPrice(fixedPrice?.toString() || '')
                              setEditingFixedPrice(true)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Default Hourly Rate */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Default Hourly Rate</p>
                    <p className="text-xs text-muted-foreground">
                      Fallback rate when no role rate applies
                    </p>
                  </div>
                  {editingDefaultRate ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editedDefaultRate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedDefaultRate(e.target.value)}
                        className="w-28 h-8"
                        placeholder="0.00"
                      />
                      <Button size="sm" variant="outline" onClick={() => setEditingDefaultRate(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleUpdateDefaultRate}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {currentDefaultRate
                          ? `${formatCurrency(currentDefaultRate.rateAmountCents)}/hr`
                          : formatDollars(defaultHourlyRate)
                            ? `${formatDollars(defaultHourlyRate)}/hr`
                            : '—'}
                      </span>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const rate = currentDefaultRate
                              ? centsToDollars(currentDefaultRate.rateAmountCents)
                              : defaultHourlyRate || 0
                            setEditedDefaultRate(rate.toString())
                            setEditingDefaultRate(true)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Billing Roles Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Billing Roles
                  </h4>
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={() => setShowAddRoleDialog(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Role
                    </Button>
                  )}
                </div>

                {billingData?.billingRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No billing roles defined. Add roles like "Senior Developer" or "Designer" to set
                    per-role rates.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {billingData?.billingRoles.map((role) => {
                      const roleRate = billingData.activeRates.find(
                        (r) => r.rateType === 'billing_role' && r.billingRoleId === role.id
                      )
                      return (
                        <Card key={role.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{role.name}</p>
                              {role.description && (
                                <p className="text-xs text-muted-foreground">{role.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums">
                                {roleRate ? `${formatCurrency(roleRate.rateAmountCents)}/hr` : '—'}
                              </span>
                              {canEdit && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditRoleDialog(role)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleArchiveRole(role.id)}
                                  >
                                    <Archive className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* Member Assignments Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Member Rates
                  </h4>
                </div>

                {billingData?.memberDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No project members found.</p>
                ) : (
                  <div className="space-y-2">
                    {billingData?.memberDetails.map((member) => (
                      <Card key={member.teamMemberId} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.userName || member.userEmail}
                            </p>
                            {member.userName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {member.userEmail}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Billing Role Selector */}
                            {canEdit && billingData?.billingRoles.length > 0 ? (
                              <select
                                value={member.billingRoleId || ''}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                  handleMemberRoleChange(
                                    member.teamMemberId,
                                    e.target.value || null
                                  )
                                }
                                className="text-xs border rounded px-2 py-1 bg-background"
                              >
                                <option value="">No role</option>
                                {billingData.billingRoles.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {member.billingRoleName || 'No role'}
                              </Badge>
                            )}

                            {/* Effective Rate */}
                            <div className="text-right min-w-[80px]">
                              <span className="text-sm font-semibold tabular-nums">
                                {member.effectiveRate
                                  ? `${formatCurrency(member.effectiveRate.rateAmountCents)}/hr`
                                  : '—'}
                              </span>
                              {member.effectiveRate && (
                                <p className="text-xs text-muted-foreground">
                                  {member.effectiveRate.sourceName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Billing Role</DialogTitle>
            <DialogDescription>
              Create a new billing role for this project. You can set the hourly rate now or later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Role Name *
              </label>
              <Input
                id="name"
                value={newRoleName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleName(e.target.value)}
                placeholder="e.g., Senior Developer"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="description"
                value={newRoleDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleDescription(e.target.value)}
                placeholder="e.g., 5+ years experience"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="rate" className="text-sm font-medium">
                Hourly Rate (USD)
              </label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                value={newRoleRate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleRate(e.target.value)}
                placeholder="e.g., 150.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={!newRoleName.trim()}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Billing Role</DialogTitle>
            <DialogDescription>Update the role name, description, or hourly rate.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Role Name *
              </label>
              <Input
                id="edit-name"
                value={newRoleName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleName(e.target.value)}
                placeholder="e.g., Senior Developer"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="edit-description"
                value={newRoleDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleDescription(e.target.value)}
                placeholder="e.g., 5+ years experience"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-rate" className="text-sm font-medium">
                Hourly Rate (USD)
              </label>
              <Input
                id="edit-rate"
                type="number"
                step="0.01"
                min="0"
                value={newRoleRate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleRate(e.target.value)}
                placeholder="e.g., 150.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={!newRoleName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
