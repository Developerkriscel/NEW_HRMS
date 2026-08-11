'use client'

import { useEffect, useState } from 'react'
import { Loader2, Settings as SettingsIcon } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { selectionApi } from '@/services/selectionApi'
import { SELECTION_APPROVAL_LEVEL_LIST, SELECTION_APPROVAL_LEVEL_LABELS } from '@/lib/selectionConstants'
import { COMPENSATION_APPROVAL_LEVEL_LIST, COMPENSATION_APPROVAL_LEVEL_LABELS } from '@/lib/compensationConstants'

// "Do not hard-code one workflow for every tenant" — the one screen where a
// Company Admin / HR Manager picks how strict Selection (Step 11) and
// Compensation (Step 12) approval should be for this tenant.
export function RecruitmentSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function load() {
    setLoading(true)
    selectionApi.getSettings().then((res) => setSettings(res.data.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function save() {
    setSaving(true); setSaved(false)
    try {
      const res = await selectionApi.updateSettings({ selectionApprovalLevel: settings.selectionApprovalLevel, compensationApprovalLevel: settings.compensationApprovalLevel })
      setSettings(res.data.data)
      setSaved(true)
    } finally { setSaving(false) }
  }

  if (loading || !settings) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recruitment Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure the approval workflows for final selection and compensation.</p>
        </div>
      </div>

      <div className="stat-card space-y-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Selection Approval</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Who must approve a "Select" decision before it counts as a confirmed selection.</p>
        <select className="input-field" value={settings.selectionApprovalLevel} onChange={(e) => setSettings((s) => ({ ...s, selectionApprovalLevel: e.target.value }))}>
          {SELECTION_APPROVAL_LEVEL_LIST.map((l) => <option key={l} value={l}>{SELECTION_APPROVAL_LEVEL_LABELS[l]}</option>)}
        </select>
      </div>

      <div className="stat-card space-y-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Compensation Approval</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Who must approve a compensation proposal before it's marked Approved and the candidate becomes Ready for Offer.</p>
        <select className="input-field" value={settings.compensationApprovalLevel} onChange={(e) => setSettings((s) => ({ ...s, compensationApprovalLevel: e.target.value }))}>
          {COMPENSATION_APPROVAL_LEVEL_LIST.map((l) => <option key={l} value={l}>{COMPENSATION_APPROVAL_LEVEL_LABELS[l]}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Settings</button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved</span>}
      </div>
    </div>
  )
}
