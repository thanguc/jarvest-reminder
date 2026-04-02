import { useState, useEffect, useRef } from 'react'
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types'
import Logo from './Logo'

function SpinnerIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

interface ConnectCardProps {
  label: string
  accentColor: string
  connected: boolean
  displayName: string
  authorizing: boolean
  error: string
  onAuthorize: () => void
  onDisconnect: () => void
}

function ConnectCard({
  label,
  accentColor,
  connected,
  displayName,
  authorizing,
  error,
  onAuthorize,
  onDisconnect
}: ConnectCardProps): JSX.Element {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${connected ? 'border-green-200 bg-green-50' : error ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {connected ? (
            <>
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-700">Connected</p>
                <p className="text-xs text-green-600 truncate">{displayName}</p>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500">Not connected to {label}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {connected ? (
            <button
              onClick={onDisconnect}
              className="text-xs text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onAuthorize}
              disabled={authorizing}
              style={{ backgroundColor: accentColor }}
              className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-60 transition-opacity font-medium"
            >
              {authorizing ? <SpinnerIcon /> : null}
              {authorizing ? 'Waiting...' : `Authorize ${label}`}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {authorizing && (
        <p className="text-xs text-gray-500 mt-1.5">
          A browser tab was opened — please sign in and allow access, then return here.
        </p>
      )}
    </div>
  )
}

export default function SettingsDialog(): JSX.Element {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [authorizingJira, setAuthorizingJira] = useState(false)
  const [authorizingHarvest, setAuthorizingHarvest] = useState(false)
  const [jiraError, setJiraError] = useState('')
  const [harvestError, setHarvestError] = useState('')
  const savedConfig = useRef<AppConfig>(DEFAULT_CONFIG)

  const isDirty =
    JSON.stringify(config.schedule) !== JSON.stringify(savedConfig.current.schedule) ||
    config.runOnStartup !== savedConfig.current.runOnStartup

  useEffect(() => {
    window.jarvest.getConfig().then((c) => {
      setConfig(c)
      savedConfig.current = c
      setLoading(false)
    })
  }, [])

  const reloadConfig = async (): Promise<void> => {
    const c = await window.jarvest.getConfig()
    setConfig(c)
    savedConfig.current = c
  }

  const handleAuthorizeJira = async (): Promise<void> => {
    setJiraError('')
    setAuthorizingJira(true)
    try {
      const error = await window.jarvest.authorizeJira()
      if (error) {
        setJiraError(error)
      } else {
        await reloadConfig()
      }
    } finally {
      setAuthorizingJira(false)
    }
  }

  const handleAuthorizeHarvest = async (): Promise<void> => {
    setHarvestError('')
    setAuthorizingHarvest(true)
    try {
      const error = await window.jarvest.authorizeHarvest()
      if (error) {
        setHarvestError(error)
      } else {
        await reloadConfig()
      }
    } finally {
      setAuthorizingHarvest(false)
    }
  }

  const handleDisconnectJira = async (): Promise<void> => {
    await window.jarvest.disconnectJira()
    setJiraError('')
    await reloadConfig()
  }

  const handleDisconnectHarvest = async (): Promise<void> => {
    await window.jarvest.disconnectHarvest()
    setHarvestError('')
    await reloadConfig()
  }

  const handleSave = async (): Promise<void> => {
    const e: Record<string, string> = {}
    if (config.schedule.workDays.length === 0) e['schedule.workDays'] = 'Select at least one day'
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    setErrors({})
    setSaving(true)
    setSaved(false)
    try {
      await window.jarvest.saveConfig(config)
      savedConfig.current = config
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = (): void => {
    window.jarvest.dismiss()
  }

  const updateSchedule = (field: string, value: number | number[]): void => {
    setConfig((prev) => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }))
    setSaved(false)
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const toggleDay = (day: number): void => {
    const current = config.schedule.workDays
    if (current.includes(day)) {
      updateSchedule('workDays', current.filter((d) => d !== day))
    } else {
      updateSchedule('workDays', [...current, day].sort())
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 flex items-center justify-center h-full">
        <svg className="animate-spin h-6 w-6 text-[#1558BC]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#F27A20] to-[#1558BC] cursor-move" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <Logo size={20} />
        <span className="text-white font-semibold text-sm">Settings</span>
        <button
          onClick={handleClose}
          className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-3 space-y-4">
        {/* Jira Section */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Jira
          </legend>
          <ConnectCard
            label="Jira"
            accentColor="#1558BC"
            connected={!!config.jira.accessToken}
            displayName={config.jira.userDisplayName}
            authorizing={authorizingJira}
            error={jiraError}
            onAuthorize={handleAuthorizeJira}
            onDisconnect={handleDisconnectJira}
          />
        </fieldset>

        {/* Harvest Section */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Harvest
          </legend>
          <ConnectCard
            label="Harvest"
            accentColor="#F27A20"
            connected={!!config.harvest.accessToken}
            displayName={config.harvest.userDisplayName}
            authorizing={authorizingHarvest}
            error={harvestError}
            onAuthorize={handleAuthorizeHarvest}
            onDisconnect={handleDisconnectHarvest}
          />
        </fieldset>

        {/* General Section */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            General
          </legend>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 mr-3">
                <p className="text-sm font-medium text-gray-700">Run on Windows startup</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  We highly recommend keeping this on — it ensures Jarvest Reminder is always running when you log in.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={config.runOnStartup}
                onClick={() => {
                  setConfig((prev) => ({ ...prev, runOnStartup: !prev.runOnStartup }))
                  setSaved(false)
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:ring-offset-1 ${
                  config.runOnStartup ? 'bg-[#1558BC]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                    config.runOnStartup ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </fieldset>

        {/* Schedule Section */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Schedule
          </legend>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-24">Work hours</label>
              <input
                type="time"
                value={`${String(config.schedule.workStartHour).padStart(2, '0')}:${String(config.schedule.workStartMinute).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  updateSchedule('workStartHour', h)
                  updateSchedule('workStartMinute', m)
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1558BC]"
              />
              <span className="text-gray-400">to</span>
              <input
                type="time"
                value={`${String(config.schedule.workEndHour).padStart(2, '0')}:${String(config.schedule.workEndMinute).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  updateSchedule('workEndHour', h)
                  updateSchedule('workEndMinute', m)
                }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1558BC]"
              />
            </div>

            <div className="flex items-start gap-2">
              <label className="text-sm text-gray-600 w-24 mt-1">Work days</label>
              <div>
                <div className="flex gap-1">
                  {dayLabels.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => { toggleDay(i); setErrors((prev) => ({ ...prev, 'schedule.workDays': '' })) }}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                        config.schedule.workDays.includes(i)
                          ? 'bg-[#1558BC] text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {label.charAt(0)}
                    </button>
                  ))}
                </div>
                {errors['schedule.workDays'] && <p className="text-xs text-red-500 mt-0.5">{errors['schedule.workDays']}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-24">Check every</label>
              <input
                type="number"
                min="5"
                max="240"
                value={config.schedule.checkPeriodMinutes}
                onChange={(e) => updateSchedule('checkPeriodMinutes', Number(e.target.value))}
                className="w-20 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1558BC]"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
          </div>
        </fieldset>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        {saved && (
          <span className="text-xs text-[#1558BC] mr-auto">Settings saved!</span>
        )}
        <button
          onClick={handleClose}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
