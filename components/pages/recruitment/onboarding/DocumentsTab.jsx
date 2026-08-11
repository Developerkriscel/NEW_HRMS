'use client'

import { useState } from 'react'
import { Eye, CheckCircle2, XCircle, RotateCcw, ShieldOff, Loader2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { preboardingApi } from '@/services/preboardingApi'
import { useAuthStore } from '@/store/authStore'
import { DOCUMENT_REJECTION_REASONS } from '@/lib/preboardingConstants'

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

function ReasonDialog({ title, onClose, onConfirm, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    if (!reason) return setError('A reason is required')
    setSaving(true); setError('')
    try { await onConfirm(reason); onDone() } catch (err) { setError(err.response?.data?.message || 'Could not save'); setSaving(false) }
  }
  return (
    <DialogShell title={title} danger error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel={title} confirmDisabled={!reason}>
      <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Select a reason</option>
        {DOCUMENT_REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </DialogShell>
  )
}

function WaiveDialog({ onClose, onConfirm, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    if (!reason.trim()) return setError('A reason is required')
    setSaving(true); setError('')
    try { await onConfirm(reason.trim()); onDone() } catch (err) { setError(err.response?.data?.message || 'Could not waive'); setSaving(false) }
  }
  return (
    <DialogShell title="Waive Requirement" error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Waive" confirmDisabled={!reason.trim()}>
      <textarea className="input-field min-h-20" placeholder="e.g. Relieving letter waived temporarily. Candidate will submit within 30 days." value={reason} onChange={(e) => setReason(e.target.value)} />
    </DialogShell>
  )
}

// item — HR Verification Page: "PAN / rahul_pan.pdf / [Preview] [Verify]
// [Reject] [Request Replacement]" per document, plus Waive for authorized
// HR. Sensitive categories (Identity/Bank/Statutory) are simply absent from
// `documents` for a session without canViewSensitive — see the API route.
export function DocumentsTab({ preboardingId, documents, canViewSensitive, onChanged }) {
  const user = useAuthStore((s) => s.user)
  const [dialog, setDialog] = useState(null) // { type, doc }
  const [busyId, setBusyId] = useState(null)

  async function verify(doc) {
    setBusyId(doc._id)
    try { await preboardingApi.verifyDocument(preboardingId, doc._id); onChanged() }
    catch (err) { alert(err.response?.data?.message || 'Could not verify') } finally { setBusyId(null) }
  }

  if (!documents || documents.length === 0) {
    return <div className="stat-card text-center py-16"><p className="text-slate-500 dark:text-slate-400">No document checklist yet — generated once the candidate's information is approved.</p></div>
  }

  return (
    <div className="stat-card space-y-1">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Documents</h3>
      <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
        {documents.map((doc) => {
          const version = doc.currentVersionId
          return (
            <div key={doc._id} className="py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{doc.name} {!doc.isRequired && <span className="text-xs text-slate-400 font-normal">(Optional)</span>}</p>
                <p className="text-xs text-slate-400 truncate">{version?.fileName || 'Not uploaded yet'}</p>
                {doc.rejectionReason && <p className="text-xs text-red-500 mt-0.5">{doc.rejectionReason}</p>}
                {doc.waiverReason && <p className="text-xs text-purple-500 mt-0.5">Waived — {doc.waiverReason}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={doc.status}>{doc.status.replace(/_/g, ' ')}</Badge>
                {version && (
                  <a href={preboardingApi.documentFileUrl(user?.tenantId, version.storageKey)} target="_blank" rel="noreferrer" className="btn-secondary !text-xs !py-1"><Eye className="w-3 h-3" /> Preview</a>
                )}
                {version && ['UPLOADED', 'UNDER_REVIEW'].includes(doc.status) && (
                  <>
                    <button disabled={busyId === doc._id} onClick={() => verify(doc)} className="btn-secondary !text-xs !py-1 !text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Verify</button>
                    <button onClick={() => setDialog({ type: 'reject', doc })} className="btn-secondary !text-xs !py-1 !text-red-600"><XCircle className="w-3 h-3" /> Reject</button>
                    <button onClick={() => setDialog({ type: 'replace', doc })} className="btn-secondary !text-xs !py-1"><RotateCcw className="w-3 h-3" /> Request Replacement</button>
                  </>
                )}
                {!['VERIFIED', 'WAIVED'].includes(doc.status) && (
                  <button onClick={() => setDialog({ type: 'waive', doc })} className="btn-secondary !text-xs !py-1"><ShieldOff className="w-3 h-3" /> Waive</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {!canViewSensitive && (
        <p className="text-xs text-slate-400 pt-3 mt-2 border-t border-slate-50 dark:border-slate-800/60">Identity, Bank and Statutory documents are hidden — you do not have permission to view them.</p>
      )}

      {dialog?.type === 'reject' && (
        <ReasonDialog title="Reject Document" onClose={() => setDialog(null)} onConfirm={(reason) => preboardingApi.rejectDocument(preboardingId, dialog.doc._id, reason)} onDone={() => { setDialog(null); onChanged() }} />
      )}
      {dialog?.type === 'replace' && (
        <ReasonDialog title="Request Replacement" onClose={() => setDialog(null)} onConfirm={(reason) => preboardingApi.requestReplacement(preboardingId, dialog.doc._id, reason)} onDone={() => { setDialog(null); onChanged() }} />
      )}
      {dialog?.type === 'waive' && (
        <WaiveDialog onClose={() => setDialog(null)} onConfirm={(reason) => preboardingApi.waiveDocument(preboardingId, dialog.doc._id, reason)} onDone={() => { setDialog(null); onChanged() }} />
      )}
    </div>
  )
}
