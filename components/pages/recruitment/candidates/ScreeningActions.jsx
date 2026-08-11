'use client'

import { useState } from 'react'
import { CheckCircle2, PauseCircle, XCircle, Archive, Loader2, LogOut } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'
import { REJECTION_REASON_LIST, WITHDRAWAL_REASON_LIST } from '@/lib/matchingConstants'
import { APPLICATION_STATUS } from '@/lib/candidateConstants'

// Shared small-modal shell — matches the bespoke MoveStageDialog/
// AddNoteDialog pattern already used across this module rather than
// forcing ConfirmDialog's free-text-only shape onto reason dropdowns.
function DialogShell({ title, description, error, saving, onClose, onConfirm, confirmLabel, confirmDisabled, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{description}</p>}
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <div className="space-y-3">{children}</div>
        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={saving || confirmDisabled} className="btn-primary">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ShortlistDialog({ onClose, onDone }) {
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    setSaving(true); setError('')
    try { await onDone(comment) } catch (err) { setError(err.response?.data?.message || 'Could not shortlist'); setSaving(false) }
  }
  return (
    <DialogShell title="Shortlist Candidate" description="Moves this application forward in the pipeline." error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Shortlist">
      <textarea className="input-field min-h-16" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
    </DialogShell>
  )
}

function HoldDialog({ onClose, onDone }) {
  const [holdUntil, setHoldUntil] = useState('')
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    if (!reason.trim()) return setError('Reason is required')
    setSaving(true); setError('')
    try { await onDone({ holdUntil: holdUntil || null, reason: reason.trim(), comment }) } catch (err) { setError(err.response?.data?.message || 'Could not place on hold'); setSaving(false) }
  }
  return (
    <DialogShell title="Place On Hold" error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Place On Hold" confirmDisabled={!reason.trim()}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Hold Until</span>
        <input type="date" className="input-field" value={holdUntil} onChange={(e) => setHoldUntil(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Reason *</span>
        <input className="input-field" placeholder="e.g. Position temporarily frozen" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <textarea className="input-field min-h-16" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
    </DialogShell>
  )
}

export function ReasonDialog({ title, reasons, onClose, onDone, confirmLabel, variant }) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const needsComment = reason === 'Other'
  async function confirm() {
    if (!reason) return setError('A reason is required')
    if (needsComment && !comment.trim()) return setError('A comment is required when the reason is "Other"')
    setSaving(true); setError('')
    try { await onDone({ reason, comment: comment.trim() || undefined }) } catch (err) { setError(err.response?.data?.message || 'Could not save'); setSaving(false) }
  }
  return (
    <DialogShell title={title} error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel={confirmLabel} confirmDisabled={!reason}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Reason *</span>
        <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason</option>
          {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Comment {needsComment && <span className="text-red-500">*</span>}</span>
        <textarea className="input-field min-h-16" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
    </DialogShell>
  )
}

function TalentPoolDialog({ onClose, onDone }) {
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    setSaving(true); setError('')
    try { await onDone(comment) } catch (err) { setError(err.response?.data?.message || 'Could not move to talent pool'); setSaving(false) }
  }
  return (
    <DialogShell title="Move to Talent Pool" description="Closes this application but keeps the candidate available for future openings." error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Move to Talent Pool">
      <textarea className="input-field min-h-16" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
    </DialogShell>
  )
}

const ACTIVE_STATUSES = [APPLICATION_STATUS.ACTIVE, APPLICATION_STATUS.ON_HOLD]

// The four HR Screening Decision buttons (item 11) plus Withdraw (Step 8
// item 10) — the AI match never triggers any of these on its own, a human
// always clicks.
export function ScreeningActions({ application, onChanged, compact = false }) {
  const [dialog, setDialog] = useState(null) // 'shortlist'|'hold'|'reject'|'talent-pool'|'withdraw'

  if (!ACTIVE_STATUSES.includes(application.status)) {
    return <p className="text-xs text-slate-400">This application is {application.status.toLowerCase().replace('_', ' ')} — no further screening actions available.</p>
  }

  const btnClass = compact ? 'btn-secondary !text-xs !py-1.5' : 'btn-secondary'

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setDialog('shortlist')} className={btnClass}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Shortlist</button>
        <button onClick={() => setDialog('hold')} className={btnClass}><PauseCircle className="w-3.5 h-3.5 text-amber-500" /> Hold</button>
        <button onClick={() => setDialog('reject')} className={btnClass}><XCircle className="w-3.5 h-3.5 text-red-500" /> Reject</button>
        <button onClick={() => setDialog('talent-pool')} className={btnClass}><Archive className="w-3.5 h-3.5 text-purple-500" /> Move to Talent Pool</button>
        <button onClick={() => setDialog('withdraw')} className={btnClass}><LogOut className="w-3.5 h-3.5 text-slate-400" /> Mark Withdrawn</button>
      </div>

      {dialog === 'shortlist' && (
        <ShortlistDialog onClose={() => setDialog(null)} onDone={async (comment) => { await candidateApi.shortlist(application._id, comment); setDialog(null); onChanged() }} />
      )}
      {dialog === 'hold' && (
        <HoldDialog onClose={() => setDialog(null)} onDone={async (data) => { await candidateApi.hold(application._id, data); setDialog(null); onChanged() }} />
      )}
      {dialog === 'reject' && (
        <ReasonDialog title="Reject Candidate" reasons={REJECTION_REASON_LIST} confirmLabel="Reject" variant="danger"
          onClose={() => setDialog(null)} onDone={async (data) => { await candidateApi.reject(application._id, data); setDialog(null); onChanged() }} />
      )}
      {dialog === 'talent-pool' && (
        <TalentPoolDialog onClose={() => setDialog(null)} onDone={async (comment) => { await candidateApi.talentPool(application._id, comment); setDialog(null); onChanged() }} />
      )}
      {dialog === 'withdraw' && (
        <ReasonDialog title="Mark as Withdrawn" reasons={WITHDRAWAL_REASON_LIST} confirmLabel="Mark Withdrawn" variant="default"
          onClose={() => setDialog(null)} onDone={async (data) => { await candidateApi.withdraw(application._id, data); setDialog(null); onChanged() }} />
      )}
    </>
  )
}
