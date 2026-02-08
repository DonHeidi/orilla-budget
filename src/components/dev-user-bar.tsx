import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { getDevUsersFn, type DevUser } from '@/lib/dev-mode.server'
import { cn } from '@/lib/utils'

const DEV_PASSWORD = 'password123'

const STORAGE_KEY = 'dev-user-bar-position'

function loadPosition(): { x: number; y: number } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

function savePosition(pos: { x: number; y: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch {}
}

export function DevUserBar() {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [users, setUsers] = useState<DevUser[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null)

  // Dragging state
  const barRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ x: number; y: number }>(
    () => loadPosition() ?? { x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 60 : 16 }
  )
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    getDevUsersFn()
      .then(async (data) => {
        setUsers(data.users)
        setCurrentUserId(data.currentUserId)

        // Auto-login as super_admin if no one is logged in
        if (!data.currentUserId) {
          const superAdmin = data.users.find((u) => u.systemRole === 'super_admin')
          if (superAdmin) {
            const { error } = await authClient.signIn.email({
              email: superAdmin.email,
              password: DEV_PASSWORD,
            })
            if (!error) {
              router.invalidate()
              return
            }
          }
        }
      })
      .catch((err) => console.error('Failed to load dev users:', err))
      .finally(() => setIsLoading(false))
  }, [])

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      setPosition({ x: newX, y: newY })
    },
    [isDragging]
  )

  const onMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    setPosition((pos) => {
      savePosition(pos)
      return pos
    })
  }, [isDragging])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      return () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
    }
  }, [isDragging, onMouseMove, onMouseUp])

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    const bar = barRef.current
    if (!bar) return
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    setIsDragging(true)
  }

  async function switchUser(user: DevUser) {
    if (user.id === currentUserId) return

    setSwitchingUserId(user.id)

    try {
      const { error } = await authClient.signIn.email({
        email: user.email,
        password: DEV_PASSWORD,
      })

      if (error) {
        console.error('Dev switch failed:', error)
        alert(`Switch failed: ${error.message}\nEnsure all dev users have password: ${DEV_PASSWORD}`)
        setSwitchingUserId(null)
      } else {
        router.invalidate()
      }
    } catch (err) {
      console.error('Dev switch error:', err)
      setSwitchingUserId(null)
    }
  }

  const currentUser = users.find((u) => u.id === currentUserId)

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        userSelect: isDragging ? 'none' : undefined,
      }}
      className="w-80 bg-amber-400 dark:bg-amber-500 text-black border-2 border-amber-600 rounded-lg shadow-2xl"
    >
      {/* Header with drag handle */}
      <div className="flex items-center">
        {/* Drag handle */}
        <div
          onMouseDown={startDrag}
          className="px-1.5 py-1.5 cursor-grab active:cursor-grabbing flex items-center text-amber-700 hover:text-black"
        >
          <GripVertical className="size-4" />
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 px-2 py-1.5 flex items-center justify-between hover:bg-amber-500/30 transition-colors cursor-pointer rounded-r-lg"
        >
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider">
            <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded text-[10px]">
              DEV
            </span>
            {isLoading ? (
              <span className="font-normal opacity-80 animate-pulse">loading...</span>
            ) : currentUser ? (
              <span className="font-normal opacity-80 truncate">
                {currentUser.handle || currentUser.name}
              </span>
            ) : (
              <span className="font-normal opacity-80">not logged in</span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="size-4 shrink-0" />
          ) : (
            <ChevronUp className="size-4 shrink-0" />
          )}
        </button>
      </div>

      {/* Expanded user list */}
      {isExpanded && (
        <div className="px-2 pb-2 pt-1 max-h-[50vh] overflow-y-auto border-t border-amber-500">
          <div className="flex flex-col gap-1">
            {users.map((user) => {
              const isCurrent = user.id === currentUserId
              const isSwitching = switchingUserId === user.id
              const displayName = user.handle || user.name
              const initial = displayName.charAt(0).toUpperCase()

              return (
                <button
                  key={user.id}
                  onClick={() => switchUser(user)}
                  disabled={isCurrent || isSwitching}
                  className={cn(
                    'p-2 rounded-md border text-left transition-all',
                    'disabled:hover:scale-100',
                    isCurrent
                      ? 'bg-black text-white border-black'
                      : 'bg-white/90 border-amber-600/30 hover:bg-white cursor-pointer',
                    isSwitching && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div
                      className={cn(
                        'size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        isCurrent
                          ? 'bg-amber-400 text-black'
                          : 'bg-amber-500 text-white'
                      )}
                    >
                      {initial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">
                        {displayName}
                      </div>
                      <div
                        className={cn(
                          'text-[10px] truncate',
                          isCurrent ? 'text-white/60' : 'text-black/50'
                        )}
                      >
                        {user.email}
                      </div>
                    </div>

                    {/* Role badges */}
                    <div className="flex flex-wrap gap-0.5 shrink-0">
                      {user.systemRole && (
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                            isCurrent
                              ? 'bg-red-500 text-white'
                              : 'bg-red-500/90 text-white'
                          )}
                        >
                          {user.systemRole === 'super_admin'
                            ? 'SUPER ADMIN'
                            : 'ADMIN'}
                        </span>
                      )}
                      {[...new Set(user.projectMemberships.map((m) => m.role))].map((role) => (
                        <span
                          key={role}
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                            isCurrent
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-600/20 text-amber-900'
                          )}
                        >
                          {role}
                        </span>
                      ))}
                    </div>

                    {isSwitching && (
                      <span className="text-[10px] font-bold animate-pulse shrink-0">
                        ...
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
