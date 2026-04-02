import { useState, useEffect, useRef } from 'react'
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types'
import Logo from './Logo'

function SpinnerIcon(): JSX.Element {
  return (
    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
      <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </span>
  )
}

function CheckIcon(): JSX.Element {
  return (
    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </span>
  )
}

function ErrorIcon({ message }: { message: string }): JSX.Element {
  return (
    <span title={message} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-default">
      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </span>
  )
}

export default function SettingsDialog(): JSX.Element {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validatingJira, setValidatingJira] = useState(false)
  const [validatingHarvest, setValidatingHarvest] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validated, setValidated] = useState<{ jira: boolean; harvest: boolean }>({ jira: false, harvest: false })
  const savedConfig = useRef<AppConfig>(DEFAULT_CONFIG)
  const [forceDirty, setForceDirty] = useState(false)

  const isDirty = forceDirty || JSON.stringify(config) !== JSON.stringify(savedConfig.current)
  const hasMissingRequired =
    !config.jira.domain.trim() ||
    !config.jira.email.trim() ||
    !config.jira.apiToken.trim() ||
    !config.harvest.accessToken.trim() ||
    !config.harvest.accountId.trim() ||
    config.schedule.workDays.length === 0

  useEffect(() => {
    window.jarvest.getConfig().then((c) => {
      setConfig(c)
      savedConfig.current = c
      setLoading(false)
    })
  }, [])

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!config.jira.domain.trim()) e['jira.domain'] = 'Required'
    if (!config.jira.email.trim()) e['jira.email'] = 'Required'
    if (!config.jira.apiToken.trim()) e['jira.apiToken'] = 'Required'
    if (!config.harvest.accessToken.trim()) e['harvest.accessToken'] = 'Required'
    if (!config.harvest.accountId.trim()) e['harvest.accountId'] = 'Required'
    if (config.schedule.workDays.length === 0) e['schedule.workDays'] = 'Select at least one day'
    return e
  }

  const handleSave = async (): Promise<void> => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setSaving(true)
    setSaved(false)
    setValidatingJira(true)
    setValidatingHarvest(true)
    try {
      const [jiraError, harvestError] = await Promise.all([
        window.jarvest.validateJira(config).finally(() => setValidatingJira(false)),
        window.jarvest.validateHarvest(config).finally(() => setValidatingHarvest(false))
      ])
      if (jiraError || harvestError) {
        setErrors({
          ...(jiraError ? { 'jira.domain': jiraError, 'jira.email': jiraError, 'jira.apiToken': jiraError } : {}),
          ...(harvestError ? { 'harvest.accessToken': harvestError, 'harvest.accountId': harvestError } : {})
        })
        setValidated({ jira: !jiraError, harvest: !harvestError })
        setForceDirty(true)
        return
      }
      setValidated({ jira: true, harvest: true })
      setForceDirty(false)
      savedConfig.current = config
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = (): void => {
    window.jarvest.dismiss()
  }

  const updateJira = (field: string, value: string): void => {
    setConfig((prev) => ({ ...prev, jira: { ...prev.jira, [field]: value } }))
    setValidated((prev) => ({ ...prev, jira: false }))
    setSaved(false)
  }

  const updateHarvest = (field: string, value: string): void => {
    setConfig((prev) => ({ ...prev, harvest: { ...prev.harvest, [field]: value } }))
    setValidated((prev) => ({ ...prev, harvest: false }))
    setSaved(false)
  }

  const updateSchedule = (field: string, value: number | number[]): void => {
    setConfig((prev) => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }))
    setSaved(false)
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const toggleDay = (day: number): void => {
    const current = config.schedule.workDays
    if (current.includes(day)) {
      updateSchedule(
        'workDays',
        current.filter((d) => d !== day)
      )
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
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
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
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Domain</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. partsdb"
                  value={config.jira.domain}
                  onChange={(e) => { updateJira('domain', e.target.value); setErrors((prev) => ({ ...prev, 'jira.domain': '' })) }}
                  onBlur={(e) => { if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, 'jira.domain': 'Required' })) }}
                  className={`w-full text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC] ${validatingJira ? 'border-gray-300 pr-8' : errors['jira.domain'] ? 'border-red-400 pr-8' : validated.jira ? 'border-green-400 pr-8' : 'border-gray-300'}`}
                />
                {validatingJira ? <SpinnerIcon /> : errors['jira.domain'] ? <ErrorIcon message={errors['jira.domain']} /> : validated.jira && <CheckIcon />}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Email</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="e.g. you@gosei.com.vn"
                  value={config.jira.email}
                  onChange={(e) => { updateJira('email', e.target.value); setErrors((prev) => ({ ...prev, 'jira.email': '' })) }}
                  onBlur={(e) => { if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, 'jira.email': 'Required' })) }}
                  className={`w-full text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC] ${validatingJira ? 'border-gray-300 pr-8' : errors['jira.email'] ? 'border-red-400 pr-8' : validated.jira ? 'border-green-400 pr-8' : 'border-gray-300'}`}
                />
                {validatingJira ? <SpinnerIcon /> : errors['jira.email'] ? <ErrorIcon message={errors['jira.email']} /> : validated.jira && <CheckIcon />}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs text-gray-500">API Token</label>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => window.jarvest.openExternal('https://id.atlassian.com/manage-profile/security/api-tokens')}
                  className="text-[10px] text-[#1558BC] hover:underline"
                >
                  Get token
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Paste your Jira API token"
                  value={config.jira.apiToken}
                  onChange={(e) => { updateJira('apiToken', e.target.value); setErrors((prev) => ({ ...prev, 'jira.apiToken': '' })) }}
                  onBlur={(e) => { if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, 'jira.apiToken': 'Required' })) }}
                  className={`w-full text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC] ${validatingJira ? 'border-gray-300 pr-8' : errors['jira.apiToken'] ? 'border-red-400 pr-8' : validated.jira ? 'border-green-400 pr-8' : 'border-gray-300'}`}
                />
                {validatingJira ? <SpinnerIcon /> : errors['jira.apiToken'] ? <ErrorIcon message={errors['jira.apiToken']} /> : validated.jira && <CheckIcon />}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Harvest Section */}
        <fieldset>
          <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Harvest
          </legend>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs text-gray-500">Access Token</label>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => window.jarvest.openExternal('https://id.getharvest.com/developers')}
                  className="text-[10px] text-[#F27A20] hover:underline"
                >
                  Get token
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Paste your Harvest access token"
                  value={config.harvest.accessToken}
                  onChange={(e) => { updateHarvest('accessToken', e.target.value); setErrors((prev) => ({ ...prev, 'harvest.accessToken': '' })) }}
                  onBlur={(e) => { if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, 'harvest.accessToken': 'Required' })) }}
                  className={`w-full text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC] ${validatingHarvest ? 'border-gray-300 pr-8' : errors['harvest.accessToken'] ? 'border-red-400 pr-8' : validated.harvest ? 'border-green-400 pr-8' : 'border-gray-300'}`}
                />
                {validatingHarvest ? <SpinnerIcon /> : errors['harvest.accessToken'] ? <ErrorIcon message={errors['harvest.accessToken']} /> : validated.harvest && <CheckIcon />}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Account ID</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 1234567"
                  value={config.harvest.accountId}
                  onChange={(e) => { updateHarvest('accountId', e.target.value); setErrors((prev) => ({ ...prev, 'harvest.accountId': '' })) }}
                  onBlur={(e) => { if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, 'harvest.accountId': 'Required' })) }}
                  className={`w-full text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC] ${validatingHarvest ? 'border-gray-300 pr-8' : errors['harvest.accountId'] ? 'border-red-400 pr-8' : validated.harvest ? 'border-green-400 pr-8' : 'border-gray-300'}`}
                />
                {validatingHarvest ? <SpinnerIcon /> : errors['harvest.accountId'] ? <ErrorIcon message={errors['harvest.accountId']} /> : validated.harvest && <CheckIcon />}
              </div>
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
          <span className="text-xs text-[#1558BC] mr-auto">Settings saved, ready to go!</span>
        )}
        <button
          onClick={handleClose}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty || hasMissingRequired}
          className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] disabled:opacity-50 transition-colors font-medium"
        >
          {validatingJira || validatingHarvest ? 'Validating...' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
