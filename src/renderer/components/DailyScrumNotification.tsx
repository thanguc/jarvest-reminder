import { useState, useEffect, useRef, CSSProperties, Fragment } from 'react'
import { AppConfig, HarvestProjectAssignment } from '../../shared/types'
import NotificationShell from './NotificationShell'

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isWorkday(dateStr: string, workDays: number[]): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  return workDays.includes(new Date(y, m - 1, d).getDay())
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

const CLOSE_DELAY_SECONDS = 5

type Step = 1 | 2 | 3 | 4

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({
  items,
  onNavigate,
  disabled
}: {
  items: { label: string; step: Step }[]
  onNavigate: (step: Step) => void
  disabled: boolean
}): JSX.Element {
  return (
    <div className="mb-3 text-xs leading-relaxed">
      {items.map((item, idx) => (
        <Fragment key={item.step}>
          {idx > 0 && (
            <span className="mx-1 text-base text-gray-500 select-none">›</span>
          )}
          <span
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && onNavigate(item.step)}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) onNavigate(item.step) }}
            className={`text-[#1558BC] text-sm hover:underline ${disabled ? 'text-gray-400 cursor-default' : 'cursor-pointer'}`}
          >
            {item.label}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

// ── Searchable dropdown ───────────────────────────────────────────────────────
//
// The list is hidden until the input is focused. It is rendered as
// position:fixed so it escapes the shell's overflow:hidden and can overlay
// the header, the action bar, or anything else.

function SearchDropdown({
  search,
  onSearchChange,
  items,
  selectedId,
  onSelect,
  searchPlaceholder,
  emptyText,
  autoFocus
}: {
  search: string
  onSearchChange: (v: string) => void
  items: { id: number; name: string }[]
  selectedId: number | null
  onSelect: (id: number) => void
  searchPlaceholder: string
  emptyText: string
  autoFocus?: boolean
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [listStyle, setListStyle] = useState<CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus when step becomes active
  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
    return undefined
  }, [autoFocus])

  // Recompute position whenever items change or list opens, so that filtering
  // down to fewer items can flip the direction (e.g. 1 result fits below).
  useEffect(() => {
    if (!isOpen || !inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const LIST_H = 192
    const GAP = 4
    const ITEM_H = 36 // approximate px per list item
    // Estimated rendered height: at least 40px (empty-state row), at most LIST_H
    const estimatedH = Math.min(LIST_H, Math.max(items.length * ITEM_H, 40))
    const spaceBelow = window.innerHeight - rect.bottom - GAP
    const spaceAbove = rect.top - GAP

    // Never resize the window — just pick the direction that fits.
    if (spaceBelow >= estimatedH) {
      setListStyle({
        position: 'fixed',
        top: rect.bottom + GAP,
        left: rect.left,
        width: rect.width,
        maxHeight: LIST_H,
        zIndex: 9999
      })
    } else {
      setListStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + GAP,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(LIST_H, spaceAbove),
        zIndex: 9999
      })
    }
  }, [isOpen, items])

  const openList = (): void => setIsOpen(true)

  const closeList = (): void => {
    setTimeout(() => setIsOpen(false), 150)
  }

  return (
    <div>
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={openList}
          onBlur={closeList}
          placeholder={searchPlaceholder}
          className="w-full text-sm border border-gray-300 rounded-md pl-7 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC]"
        />
      </div>
      {isOpen && (
        <ul
          style={listStyle}
          className="bg-white border border-gray-200 rounded-md shadow-lg overflow-y-auto"
        >
          {items.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-400 italic">{emptyText}</li>
          ) : (
            items.map((item) => {
              const isSelected = item.id === selectedId
              return (
                <li
                  key={item.id}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item.id) }}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 hover:bg-blue-50 ${isSelected ? 'bg-blue-50 text-[#1558BC] font-medium' : 'text-gray-800'}`}
                >
                  <span className="truncate">{item.name}</span>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#1558BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

// ── Step label ────────────────────────────────────────────────────────────────

function StepLabel({ text }: { text: string }): JSX.Element {
  return <p className="text-xs font-medium text-gray-500 mb-1.5">{text}</p>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DailyScrumNotification(): JSX.Element {
  const [assignments, setAssignments] = useState<HarvestProjectAssignment[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>(1)

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [minutes, setMinutes] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [dateText, setDateText] = useState(() => formatDateDisplay(todayString()))

  const [projectSearch, setProjectSearch] = useState('')
  const [taskSearch, setTaskSearch] = useState('')
  const [dateError, setDateError] = useState('')
  const [minutesError, setMinutesError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [closeCountdown, setCloseCountdown] = useState<number | null>(null)

  const minutesRef = useRef<HTMLInputElement>(null)
  const hiddenDateRef = useRef<HTMLInputElement>(null)
  const closeCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load projects + prefs + config; jump to step 4 if both project & task are already saved
  useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        const [projectAssignments, prefs, appConfig] = await Promise.all([
          window.jarvest.getHarvestProjects(),
          window.jarvest.getDailyScrumPrefs(),
          window.jarvest.getConfig()
        ])
        setAssignments(projectAssignments)
        setConfig(appConfig)
        if (prefs.projectId !== null) setSelectedProjectId(prefs.projectId)
        if (prefs.taskId !== null) setSelectedTaskId(prefs.taskId)
        if (prefs.notes) setNotes(prefs.notes)
        if (prefs.projectId !== null && prefs.taskId !== null) {
          setStep(4)
        }
      } catch (err) {
        console.error('Failed to load daily scrum data', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Auto-focus minutes input when on step 4
  useEffect(() => {
    if (step === 4 && !loading) {
      const t = setTimeout(() => minutesRef.current?.select(), 30)
      return () => clearTimeout(t)
    }
    return undefined
  }, [step, loading])

  // Derived
  const selectedProject = assignments.find((a) => a.project.id === selectedProjectId)
  const selectedTask = selectedProject?.task_assignments.find((ta) => ta.task.id === selectedTaskId)?.task

  const projectOptions = assignments.map((a) => ({ id: a.project.id, name: a.project.name }))
  const taskOptions = selectedProject?.task_assignments.map((ta) => ({ id: ta.task.id, name: ta.task.name })) ?? []

  const filteredProjects = projectSearch.trim()
    ? projectOptions.filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    : projectOptions

  const filteredTasks = taskSearch.trim()
    ? taskOptions.filter((t) => t.name.toLowerCase().includes(taskSearch.toLowerCase()))
    : taskOptions

  // Handlers
  const handleProjectSelect = (id: number): void => {
    if (id !== selectedProjectId) {
      setSelectedProjectId(id)
      setSelectedTaskId(null)
    }
    setProjectSearch('')
    setStep(2)
  }

  const handleTaskSelect = (id: number): void => {
    setSelectedTaskId(id)
    setTaskSearch('')
    setStep(3)
  }

  const handleNavigate = (targetStep: Step): void => setStep(targetStep)

  const handleDateTextChange = (val: string): void => {
    setDateText(val)
    const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (match) {
      const d = match[1].padStart(2, '0')
      const m = match[2].padStart(2, '0')
      const y = match[3]
      const parsed = new Date(Number(y), Number(m) - 1, Number(d))
      const valid = !isNaN(parsed.getTime())
        && parsed.getDate() === Number(d)
        && parsed.getMonth() === Number(m) - 1
      if (valid) {
        setSelectedDate(`${y}-${m}-${d}`)
        setDateError('')
      } else {
        setDateError('Invalid date')
      }
    } else {
      setDateError('')
    }
  }

  const handlePickerChange = (val: string): void => {
    const date = val || todayString()
    setSelectedDate(date)
    setDateText(formatDateDisplay(date))
    setDateError('')
  }

  const startCloseCountdown = (): void => {
    let remaining = CLOSE_DELAY_SECONDS
    setCloseCountdown(remaining)
    closeCountdownRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        if (closeCountdownRef.current) clearInterval(closeCountdownRef.current)
        window.jarvest.dismiss()
      } else {
        setCloseCountdown(remaining)
      }
    }, 1000)
  }

  const handleSave = async (): Promise<void> => {
    if (minutes === null || minutes <= 1) {
      setMinutesError('Time spent must be greater than 1 minute')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await window.jarvest.logDailyScrum(selectedProjectId!, selectedTaskId!, minutes / 60, notes, selectedDate)
      await window.jarvest.saveDailyScrumPrefs({ projectId: selectedProjectId, taskId: selectedTaskId, notes })
      setSaved(true)
      startCloseCountdown()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to log entry')
      setSaving(false)
    }
  }

  const handleClose = (): void => {
    if (closeCountdownRef.current) clearInterval(closeCountdownRef.current)
    window.jarvest.dismiss()
  }

  const isFormDisabled = saving || saved

  // Breadcrumb items — one per completed step before the current one
  const breadcrumbItems: { label: string; step: Step }[] = []
  if (step >= 2 && selectedProject) {
    breadcrumbItems.push({ label: selectedProject.project.name, step: 1 })
  }
  if (step >= 3 && selectedTask) {
    breadcrumbItems.push({ label: selectedTask.name, step: 2 })
  }
  if (step >= 4) {
    breadcrumbItems.push({ label: notes.trim() || 'No notes', step: 3 })
  }

  return (
    <NotificationShell
      title="Log Daily Scrum"
      topReserve={step <= 2 ? 150 : 0}
      actions={
        <>
          {closeCountdown !== null && (
            <span className="text-xs text-gray-400 mr-auto">Closing in {closeCountdown}s…</span>
          )}
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
          >
            Close
          </button>
          {step === 3 && (
            <button
              onClick={() => setStep(4)}
              className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] transition-colors font-medium"
            >
              Next
            </button>
          )}
          {step === 4 && (
            <button
              onClick={handleSave}
              disabled={isFormDisabled}
              className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Entry'}
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <svg className="animate-spin h-5 w-5 text-[#1558BC]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-sm text-gray-500">Loading projects…</span>
        </div>
      ) : (
        <div>
          {breadcrumbItems.length > 0 && (
            <Breadcrumb items={breadcrumbItems} onNavigate={handleNavigate} disabled={isFormDisabled} />
          )}

          {step === 1 && (
            <>
              <StepLabel text="Choose a project" />
              <SearchDropdown
                search={projectSearch}
                onSearchChange={setProjectSearch}
                items={filteredProjects}
                selectedId={selectedProjectId}
                onSelect={handleProjectSelect}
                searchPlaceholder="Search projects…"
                emptyText="No projects found"
              />
            </>
          )}

          {step === 2 && (
            <>
              <StepLabel text="Choose a task" />
              <SearchDropdown
                search={taskSearch}
                onSearchChange={setTaskSearch}
                items={filteredTasks}
                selectedId={selectedTaskId}
                onSelect={handleTaskSelect}
                searchPlaceholder="Search tasks…"
                emptyText="No tasks found"
              />
            </>
          )}

          {step === 3 && (
            <>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note for this scrum entry (optional)…"
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC] resize-none"
              />
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex gap-3 mb-3">
                {/* Date field */}
                <div className="w-1/2 min-w-0">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
                  <div className="relative border border-gray-300 rounded-md focus-within:ring-1 focus-within:ring-[#1558BC] focus-within:border-[#1558BC]">
                    <input
                      type="text"
                      value={dateText}
                      onChange={(e) => handleDateTextChange(e.target.value)}
                      onBlur={() => {
                        const match = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
                        if (!match) setDateText(formatDateDisplay(selectedDate))
                      }}
                      placeholder="dd/MM/yyyy"
                      disabled={isFormDisabled}
                      className="w-full text-sm px-2.5 pr-14 py-2 rounded-md focus:outline-none bg-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                    />
                    {/* Error / warning icon — left of calendar button */}
                    {dateError ? (
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 group pointer-events-auto">
                        <svg className="w-4 h-4 text-red-500 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-50 pointer-events-none whitespace-nowrap bg-red-600 text-white text-xs rounded px-2 py-1 shadow-lg">
                          {dateError}
                        </div>
                      </div>
                    ) : config && !isWorkday(selectedDate, config.schedule.workDays) && (
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 group pointer-events-auto">
                        <svg className="w-4 h-4 text-amber-500 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-50 pointer-events-none whitespace-nowrap bg-amber-600 text-white text-xs rounded px-2 py-1 shadow-lg">
                          This date is not a work day
                        </div>
                      </div>
                    )}
                    {/* Calendar button */}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => (hiddenDateRef.current as any)?.showPicker?.()}
                      disabled={isFormDisabled}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {/* Hidden native date input — provides the picker popup */}
                    <input
                      ref={hiddenDateRef}
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handlePickerChange(e.target.value)}
                      tabIndex={-1}
                      className="absolute opacity-0 bottom-0 right-0 w-8 h-full pointer-events-none"
                    />
                  </div>
                </div>

                {/* Time spent field */}
                <div className="w-1/2 min-w-0">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Spent Time
                  </label>
                  <div className="flex border border-gray-300 rounded-md focus-within:ring-1 focus-within:ring-[#1558BC] focus-within:border-[#1558BC]">
                    <div className="relative flex-1 min-w-0">
                      <input
                        ref={minutesRef}
                        type="number"
                        min={0}
                        value={minutes ?? ''}
                        onChange={(e) => {
                          setMinutes(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0))
                          setMinutesError('')
                        }}
                        disabled={isFormDisabled}
                        className="w-full text-sm rounded-l-md px-2.5 py-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                      />
                      {minutesError && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 group pointer-events-auto">
                          <svg className="w-4 h-4 text-red-500 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-50 pointer-events-none whitespace-nowrap bg-red-600 text-white text-xs rounded px-2 py-1 shadow-lg">
                            {minutesError}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="flex items-center px-2.5 text-sm text-gray-500 bg-gray-50 border-l border-gray-300 rounded-r-md select-none">
                      minutes
                    </span>
                  </div>
                </div>
              </div>
              {saved && selectedProject && selectedTask && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-2.5">
                  <p className="text-xs text-green-700">
                    Logged {minutes}m to <strong>{selectedProject.project.name}</strong> / <strong>{selectedTask.name}</strong>
                  </p>
                </div>
              )}
              {saveError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-2.5">
                  <p className="text-xs text-red-700">{saveError}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </NotificationShell>
  )
}
