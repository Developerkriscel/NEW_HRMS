'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { compensationApi } from '@/services/compensationApi'

function DialogShell({ title, error, saving, onClose, onConfirm, confirmLabel, confirmDisabled, children, danger }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">{title}</h2>
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

// item 8 — the approver's consolidated view actions: Approve / Reject /
// Request Revision. Reject needs a reason; Request Revision needs a
// suggested CTC + mandatory comment ("HR revises the proposal").
export function CompensationApprovalActions({ proposalId, onDone }) {
  const [dialog, setDialog] = useState(null) // 'reject' | 'revise'
  const [busy, setBusy] = useState(false)

  async function approve() {
    setBusy(true)
    try { await compensationApi.approve(proposalId, ''); onDone() } catch (err) { alert(err.response?.data?.message || 'Could not approve'); setBusy(false) }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={busy} onClick={approve} className="btn-primary !bg-emerald-600 hover:!bg-emerald-700">Approve</button>
      <button disabled={busy} onClick={() => setDialog('revise')} className="btn-secondary">Request Revision</button>
      <button disabled={busy} onClick={() => setDialog('reject')} className="btn-secondary !text-red-600">Reject</button>
      {dialog === 'reject' && <RejectDialog proposalId={proposalId} onClose={() => setDialog(null)} onDone={onDone} />}
      {dialog === 'revise' && <RequestRevisionDialog proposalId={proposalId} onClose={() => setDialog(null)} onDone={onDone} />}
    </div>
  )
}

function RejectDialog({ proposalId, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!reason.trim()) return setError('A reason is required')
    setSaving(true); setError('')
    try { await compensationApi.reject(proposalId, reason.trim()); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not reject'); setSaving(false) }
  }

  return (
    <DialogShell title="Reject Compensation Proposal" danger error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Reject" confirmDisabled={!reason.trim()}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Reason *</span>
        <textarea className="input-field min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
    </DialogShell>
  )
}

function RequestRevisionDialog({ proposalId, onClose, onDone }) {
  const [suggestedCtc, setSuggestedCtc] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!suggestedCtc || Number(suggestedCtc) <= 0) return setError('A suggested CTC is required')
    if (!comment.trim()) return setError('A comment is required')
    setSaving(true); setError('')
    try { await compensationApi.requestRevision(proposalId, { suggestedCtc: Number(suggestedCtc), comment: comment.trim() }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not request revision'); setSaving(false) }
  }

  return (
    <DialogShell title="Request Revision" error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Request Revision" confirmDisabled={!suggestedCtc || !comment.trim()}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Suggested CTC (₹L) *</span>
        <input type="number" className="input-field" value={suggestedCtc} onChange={(e) => setSuggestedCtc(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Comment *</span>
        <textarea className="input-field min-h-16" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
    </DialogShell>
  )
}
