'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { preboardingApi } from '@/services/preboardingApi'
import { PREBOARDING_FORM_SECTIONS } from '@/lib/preboardingConstants'

function DialogShell({ title, description, error, saving, onClose, onConfirm, confirmLabel, confirmDisabled, children, danger }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{description}</p>}
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <div className="space-y-3">{children}</div>
        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={saving || confirmDisabled} className={danger ? 'btn-danger' : 'btn-primary'}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// item 11/12 (Step 15) — "select specific fields" + mandatory comment.
export function RequestCorrectionDialog({ id, onClose, onDone }) {
  const [fields, setFields] = useState([])
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggle(key) { setFields((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key])) }

  async function confirm() {
    if (!fields.length) return setError('Select at least one section')
    if (!comment.trim()) return setError('A comment is required')
    setSaving(true); setError('')
    try { await preboardingApi.requestCorrection(id, { fields, comment: comment.trim() }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not request correction'); setSaving(false) }
  }

  return (
    <DialogShell title="Request Correction" error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Request Correction" confirmDisabled={!fields.length || !comment.trim()}>
      <div className="space-y-1.5">
        {PREBOARDING_FORM_SECTIONS.map((s) => (
          <label key={s.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={fields.includes(s.key)} onChange={() => toggle(s.key)} /> {s.label}
          </label>
        ))}
      </div>
      <textarea className="input-field min-h-20" placeholder="Comment for the candidate..." value={comment} onChange={(e) => setComment(e.target.value)} />
    </DialogShell>
  )
}

export function ChangeJoiningDateDialog({ id, onClose, onDone }) {
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!date) return setError('A joining date is required')
    setSaving(true); setError('')
    try { await preboardingApi.changeJoiningDate(id, date); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not update joining date'); setSaving(false) }
  }

  return (
    <DialogShell title="Change Joining Date" error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Update" confirmDisabled={!date}>
      <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
    </DialogShell>
  )
}

export function CancelPreboardingDialog({ id, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!reason.trim()) return setError('A reason is required')
    setSaving(true); setError('')
    try { await preboardingApi.cancel(id, reason.trim()); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not cancel'); setSaving(false) }
  }

  return (
    <DialogShell title="Cancel Preboarding" danger error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Cancel Preboarding" confirmDisabled={!reason.trim()}>
      <textarea className="input-field min-h-20" placeholder="Reason..." value={reason} onChange={(e) => setReason(e.target.value)} />
    </DialogShell>
  )
}
