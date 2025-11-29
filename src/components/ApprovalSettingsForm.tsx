import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApprovalMode, ApprovalStage, UpdateProjectApprovalSettings } from '@/schemas'
import { cn } from '@/lib/utils'
import { GripVertical, Plus, X } from 'lucide-react'

interface ApprovalSettingsFormProps {
  settings: {
    approvalMode: ApprovalMode
    autoApproveAfterDays: number
    requireAllEntriesApproved: boolean
    allowSelfApproveNoClient: boolean
    approvalStages: ApprovalStage[] | null
  }
  onSave: (updates: UpdateProjectApprovalSettings) => Promise<void>
  isLoading?: boolean
  className?: string
}

const approvalModeOptions: { value: ApprovalMode; label: string; description: string }[] = [
  {
    value: 'required',
    label: 'Required',
    description: 'Client or reviewer must approve all time sheets',
  },
  {
    value: 'optional',
    label: 'Optional',
    description: 'Time sheets can be approved but approval is not required',
  },
  {
    value: 'self_approve',
    label: 'Self-Approve',
    description: 'Experts can approve their own time sheets when no client is assigned',
  },
  {
    value: 'multi_stage',
    label: 'Multi-Stage',
    description: 'Configure multiple approval stages with specific roles',
  },
]

const stageOptions: { value: ApprovalStage; label: string }[] = [
  { value: 'expert', label: 'Expert' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'client', label: 'Client' },
  { value: 'owner', label: 'Owner' },
]

export function ApprovalSettingsForm({
  settings,
  onSave,
  isLoading = false,
  className,
}: ApprovalSettingsFormProps) {
  const [formData, setFormData] = useState({
    approvalMode: settings.approvalMode,
    autoApproveAfterDays: settings.autoApproveAfterDays,
    requireAllEntriesApproved: settings.requireAllEntriesApproved,
    allowSelfApproveNoClient: settings.allowSelfApproveNoClient,
    approvalStages: settings.approvalStages || [],
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        approvalMode: formData.approvalMode,
        autoApproveAfterDays: formData.autoApproveAfterDays,
        requireAllEntriesApproved: formData.requireAllEntriesApproved,
        allowSelfApproveNoClient: formData.allowSelfApproveNoClient,
        approvalStages:
          formData.approvalMode === 'multi_stage' ? formData.approvalStages : undefined,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addStage = () => {
    const availableStages = stageOptions.filter(
      (s) => !formData.approvalStages.includes(s.value)
    )
    if (availableStages.length > 0) {
      setFormData({
        ...formData,
        approvalStages: [...formData.approvalStages, availableStages[0].value],
      })
    }
  }

  const removeStage = (index: number) => {
    setFormData({
      ...formData,
      approvalStages: formData.approvalStages.filter((_, i) => i !== index),
    })
  }

  const updateStage = (index: number, value: ApprovalStage) => {
    const newStages = [...formData.approvalStages]
    newStages[index] = value
    setFormData({ ...formData, approvalStages: newStages })
  }

  const disabled = isLoading || isSaving

  return (
    <div className={cn('space-y-6', className)}>
      {/* Approval Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Approval Mode</label>
        <Select
          value={formData.approvalMode}
          onValueChange={(value) =>
            setFormData({ ...formData, approvalMode: value as ApprovalMode })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {approvalModeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Multi-Stage Configuration */}
      {formData.approvalMode === 'multi_stage' && (
        <div className="space-y-3">
          <label className="text-sm font-medium">Approval Stages (in order)</label>
          <div className="space-y-2">
            {formData.approvalStages.map((stage, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                <Select
                  value={stage}
                  onValueChange={(value) => updateStage(index, value as ApprovalStage)}
                  disabled={disabled}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stageOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={
                          formData.approvalStages.includes(option.value) &&
                          option.value !== stage
                        }
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStage(index)}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {formData.approvalStages.length < stageOptions.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={addStage}
                disabled={disabled}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Stage
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Auto-Approve Days */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Auto-Approve After (days)</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={formData.autoApproveAfterDays}
            onChange={(e) =>
              setFormData({
                ...formData,
                autoApproveAfterDays: parseInt(e.target.value) || 0,
              })
            }
            disabled={disabled}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">
            {formData.autoApproveAfterDays === 0
              ? 'Disabled'
              : `days without questions`}
          </span>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="requireAllEntriesApproved"
            checked={formData.requireAllEntriesApproved}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                requireAllEntriesApproved: checked === true,
              })
            }
            disabled={disabled}
          />
          <label htmlFor="requireAllEntriesApproved" className="text-sm">
            Require all entries to be individually approved before sheet approval
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="allowSelfApproveNoClient"
            checked={formData.allowSelfApproveNoClient}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                allowSelfApproveNoClient: checked === true,
              })
            }
            disabled={disabled}
          />
          <label htmlFor="allowSelfApproveNoClient" className="text-sm">
            Allow experts to self-approve when no client is assigned
          </label>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={disabled}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
