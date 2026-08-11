'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { preboardingApi } from '@/services/preboardingApi'
import { DOCUMENT_REQUIREMENT_CATEGORIES } from '@/lib/preboardingConstants'
import { JOB_EMPLOYMENT_TYPE_LIST, JOB_EMPLOYMENT_TYPE_LABELS } from '@/lib/jobConstants'

// item 1/2 (Step 16) — configurable Document Requirement Master, grouped by
// employment type so "don't hard-code one list for everyone" is visible at
// a glance.
export function DocumentRequirementsPage() {
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  function load() {
    setLoading(true)
    preboardingApi.listDocumentRequirements().then((res) => setRequirements(res.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const groups = [null, ...JOB_EMPLOYMENT_TYPE_LIST].map((type) => ({
    type, label: type ? JOB_EMPLOYMENT_TYPE_LABELS[type] : 'All Employment Types',
    items: requirements.filter((r) => r.employmentType === type),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/hr/recruitment/onboarding" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Preboarding
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Document Requirements</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure which documents are required by employment type.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Requirement</button>
      </div>

      {loading ? <PageLoader /> : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.label} className="stat-card !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-semibold text-sm text-slate-700 dark:text-slate-200">{g.label}</div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {g.items.map((r) => (
                  <button key={r._id} onClick={() => setEditing(r)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.category}</p>
                    </div>
                    <Badge variant={r.isRequired ? 'ACTIVE' : 'INACTIVE'}>{r.isRequired ? 'Required' : 'Optional'}</Badge>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <RequirementEditorModal requirement={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {creating && <RequirementEditorModal requirement={null} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
    </div>
  )
}

function RequirementEditorModal({ requirement, onClose, onSaved }) {
  const [name, setName] = useState(requirement?.name || '')
  const [category, setCategory] = useState(requirement?.category || 'Other')
  const [employmentType, setEmploymentType] = useState(requirement?.employmentType || '')
  const [isRequired, setIsRequired] = useState(requirement?.isRequired !== false)
  const [requiresVerification, setRequiresVerification] = useState(requirement?.requiresVerification !== false)
  const [tracksExpiry, setTracksExpiry] = useState(!!requirement?.tracksExpiry)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) return setError('A name is required')
    setSaving(true); setError('')
    const data = { name: name.trim(), category, employmentType: employmentType || null, isRequired, requiresVerification, tracksExpiry }
    try {
      if (requirement) await preboardingApi.updateDocumentRequirement(requirement._id, data)
      else await preboardingApi.createDocumentRequirement(data)
      onSaved()
    } catch (err) { setError(err.response?.data?.message || 'Could not save'); setSaving(false) }
  }
  async function remove() {
    if (!requirement || !confirm('Delete this requirement?')) return
    setSaving(true)
    try { await preboardingApi.deleteDocumentRequirement(requirement._id); onSaved() } catch (err) { setError(err.response?.data?.message || 'Could not delete'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{requirement ? 'Edit Requirement' : 'New Requirement'}</h2>
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Name *</span>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Category</span>
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {DOCUMENT_REQUIREMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Employment Type</span>
            <select className="input-field" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              <option value="">All Types</option>
              {JOB_EMPLOYMENT_TYPE_LIST.map((t) => <option key={t} value={t}>{JOB_EMPLOYMENT_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} /> Required</label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={requiresVerification} onChange={(e) => setRequiresVerification(e.target.checked)} /> Requires HR verification</label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={tracksExpiry} onChange={(e) => setTracksExpiry(e.target.checked)} /> Tracks issue/expiry date</label>

        <div className="flex justify-between items-center pt-2">
          {requirement ? <button onClick={remove} disabled={saving} className="btn-secondary !text-red-600"><Trash2 className="w-3.5 h-3.5" /> Delete</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
