import { useState, useEffect } from 'react'
import { AppConfig, DEFAULT_CONFIG } from '../../shared/types'
import Logo from './Logo'

export default function SettingsDialog(): JSX.Element {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.jarvest.getConfig().then((c) => {
      setConfig(c)
      setLoading(false)
    })
  }, [])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setSaved(false)
    try {
      await window.jarvest.saveConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = (): void => {
    window.jarvest.dismiss()
  }

  const updateJira = (field: string, value: string): void => {
    setConfig((prev) => ({ ...prev, jira: { ...prev.jira, [field]: value } }))
  }

  const updateHarvest = (field: string, value: string): void => {
    setConfig((prev) => ({ ...prev, harvest: { ...prev.harvest, [field]: value } }))
  }

  const updateSchedule = (field: string, value: number | number[]): void => {
    setConfig((prev) => ({ ...prev, schedule: { ...prev.schedule, [field]: value } }))
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
              <input
                type="text"
                placeholder="e.g. partsdb"
                value={config.jira.domain}
                onChange={(e) => updateJira('domain', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Email</label>
              <input
                type="email"
                placeholder="e.g. you@company.com"
                value={config.jira.email}
                onChange={(e) => updateJira('email', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs text-gray-500">API Token</label>
                <button
                  type="button"
                  onClick={() => window.jarvest.openExternal('https://id.atlassian.com/manage-profile/security/api-tokens')}
                  className="text-[10px] text-[#1558BC] hover:underline"
                >
                  Get token
                </button>
              </div>
              <input
                type="password"
                placeholder="Paste your Jira API token"
                value={config.jira.apiToken}
                onChange={(e) => updateJira('apiToken', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC]"
              />
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
                  onClick={() => window.jarvest.openExternal('https://id.getharvest.com/developers')}
                  className="text-[10px] text-[#F27A20] hover:underline"
                >
                  Get token
                </button>
              </div>
              <input
                type="password"
                placeholder="Paste your Harvest access token"
                value={config.harvest.accessToken}
                onChange={(e) => updateHarvest('accessToken', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Account ID</label>
              <input
                type="text"
                placeholder="e.g. 1234567"
                value={config.harvest.accountId}
                onChange={(e) => updateHarvest('accountId', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1558BC] focus:border-[#1558BC]"
              />
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

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-24">Work days</label>
              <div className="flex gap-1">
                {dayLabels.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => toggleDay(i)}
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
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-[#1558BC] text-white rounded-md hover:bg-[#0f4a9e] disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
