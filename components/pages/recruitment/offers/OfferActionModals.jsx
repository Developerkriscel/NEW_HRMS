'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { offerApi } from '@/services/offerApi'

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

// item 8 — approver's Approve / Reject / Request Revision.
export function OfferApprovalActions({ offerId, onDone }) {
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)

  async function approve() {
    setBusy(true)
    try { await offerApi.approve(offerId, ''); onDone() } catch (err) { alert(err.response?.data?.message || 'Could not approve'); setBusy(false) }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={busy} onClick={approve} className="btn-primary !bg-emerald-600 hover:!bg-emerald-700">Approve</button>
      <button disabled={busy} onClick={() => setDialog('revise')} className="btn-secondary">Request Revision</button>
      <button disabled={busy} onClick={() => setDialog('reject')} className="btn-secondary !text-red-600">Reject</button>
      {dialog === 'reject' && <ReasonDialog title="Reject Offer" danger fieldLabel="Reason" onClose={() => setDialog(null)} onConfirm={(v) => offerApi.reject(offerId, v)} onDone={onDone} />}
      {dialog === 'revise' && <ReasonDialog title="Request Revision" fieldLabel="Comment" onClose={() => setDialog(null)} onConfirm={(v) => offerApi.requestRevision(offerId, v)} onDone={onDone} />}
    </div>
  )
}

function ReasonDialog({ title, danger, fieldLabel, onClose, onConfirm, onDone }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!value.trim()) return setError(`${fieldLabel} is required`)
    setSaving(true); setError('')
    try { await onConfirm(value.trim()); onDone() } catch (err) { setError(err.response?.data?.message || 'Could not save'); setSaving(false) }
  }

  return (
    <DialogShell title={title} danger={danger} error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel={title} confirmDisabled={!value.trim()}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{fieldLabel} *</span>
        <textarea className="input-field min-h-20" value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
    </DialogShell>
  )
}

// HR-side Withdraw — mandatory reason.
export function WithdrawOfferDialog({ offerId, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!reason.trim()) return setError('A withdrawal reason is required')
    setSaving(true); setError('')
    try { await offerApi.withdraw(offerId, reason.trim()); onDone() } catch (err) { setError(err.response?.data?.message || 'Could not withdraw'); setSaving(false) }
  }

  return (
    <DialogShell title="Withdraw Offer" danger description="The candidate portal will show this offer as no longer active." error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Withdraw Offer" confirmDisabled={!reason.trim()}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Withdrawal Reason *</span>
        <textarea className="input-field min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
    </DialogShell>
  )
}

// HR-side Extend Expiry.
export function ExtendExpiryDialog({ offerId, onClose, onDone }) {
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!date) return setError('A new expiry date is required')
    setSaving(true); setError('')
    try { await offerApi.extendExpiry(offerId, date); onDone() } catch (err) { setError(err.response?.data?.message || 'Could not extend expiry'); setSaving(false) }
  }

  return (
    <DialogShell title="Extend Offer Validity" error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Extend" confirmDisabled={!date}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">New Valid Until *</span>
        <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
    </DialogShell>
  )
}
