'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { selectionApi } from '@/services/selectionApi'
import { departmentApi, designationApi } from '@/services/departmentApi'
import { jobApi } from '@/services/jobApi'
import { JOB_EMPLOYMENT_TYPE_LIST, JOB_EMPLOYMENT_TYPE_LABELS } from '@/lib/jobConstants'
import { SELECTION_HOLD_REASONS, ADDITIONAL_ROUND_INTERVIEW_TYPES } from '@/lib/selectionConstants'
import { REJECTION_REASON_LIST } from '@/lib/matchingConstants'

function DialogShell({ title, description, error, saving, onClose, onConfirm, confirmLabel, confirmDisabled, children, danger }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
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

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label} {required && <span className="text-red-500">*</span>}</span>
      {children}
    </label>
  )
}

// item 4 — Select opens a modal collecting position/openings info, joining
// date, proposed designation/department/reporting manager/employment type,
// comment. "Do not mark candidate as hired yet."
export function SelectDialog({ applicationId, vacancy, onClose, onDone }) {
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ recommendedDesignationId: '', recommendedDepartmentId: '', recommendedManagerId: '', proposedJoiningDate: '', employmentType: '', comments: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([departmentApi.getAll(), designationApi.getAll(), jobApi.getEmployees()])
      .then(([d, r, e]) => { setDepartments(d.data.data || []); setDesignations(r.data.data || []); setEmployees(e.data.data || []) })
      .catch(() => {})
  }, [])

  async function confirm() {
    if (!form.proposedJoiningDate) return setError('A recommended joining date is required')
    setSaving(true); setError('')
    try {
      await selectionApi.select(applicationId, { ...form, recommendedDesignationId: form.recommendedDesignationId || undefined, recommendedDepartmentId: form.recommendedDepartmentId || undefined, recommendedManagerId: form.recommendedManagerId || undefined })
      onDone()
    } catch (err) { setError(err.response?.data?.message || 'Could not record selection'); setSaving(false) }
  }

  return (
    <DialogShell title="Select Candidate" description="This marks the company's intent to proceed — it does not mark the candidate as hired." error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Confirm Selection" confirmDisabled={!form.proposedJoiningDate}>
      {vacancy?.warning && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">⚠ {vacancy.warning}</div>
      )}
      <Field label="Recommended Joining Date" required>
        <input type="date" className="input-field" value={form.proposedJoiningDate} onChange={(e) => setForm((f) => ({ ...f, proposedJoiningDate: e.target.value }))} />
      </Field>
      <Field label="Proposed Designation">
        <select className="input-field" value={form.recommendedDesignationId} onChange={(e) => setForm((f) => ({ ...f, recommendedDesignationId: e.target.value }))}>
          <option value="">Select designation</option>
          {designations.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Department">
        <select className="input-field" value={form.recommendedDepartmentId} onChange={(e) => setForm((f) => ({ ...f, recommendedDepartmentId: e.target.value }))}>
          <option value="">Select department</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Reporting Manager">
        <select className="input-field" value={form.recommendedManagerId} onChange={(e) => setForm((f) => ({ ...f, recommendedManagerId: e.target.value }))}>
          <option value="">Select manager</option>
          {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="Employment Type">
        <select className="input-field" value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}>
          <option value="">Select type</option>
          {JOB_EMPLOYMENT_TYPE_LIST.map((t) => <option key={t} value={t}>{JOB_EMPLOYMENT_TYPE_LABELS[t]}</option>)}
        </select>
      </Field>
      <Field label="Comment">
        <textarea className="input-field min-h-16" value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} />
      </Field>
    </DialogShell>
  )
}

// item 5 — Additional Round: reason + interview type + comments, moves the
// candidate back to an interview stage.
export function AdditionalRoundDialog({ applicationId, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [interviewType, setInterviewType] = useState('')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!reason.trim()) return setError('A reason is required')
    if (!interviewType) return setError('An interview type is required')
    setSaving(true); setError('')
    try { await selectionApi.additionalRound(applicationId, { reason: reason.trim(), interviewType, comments }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not send to an additional round'); setSaving(false) }
  }

  return (
    <DialogShell title="Send to Additional Round" error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Send Back" confirmDisabled={!reason.trim() || !interviewType}>
      <Field label="Reason" required>
        <textarea className="input-field min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field label="Interview Type" required>
        <select className="input-field" value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
          <option value="">Select type</option>
          {ADDITIONAL_ROUND_INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Comments">
        <textarea className="input-field min-h-16" value={comments} onChange={(e) => setComments(e.target.value)} />
      </Field>
    </DialogShell>
  )
}

// item 6 — Hold: fixed reason list + a mandatory review date, so HR doesn't
// forget the candidate.
export function SelectionHoldDialog({ applicationId, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [reviewDate, setReviewDate] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!reason) return setError('A reason is required')
    if (!reviewDate) return setError('A review date is required')
    setSaving(true); setError('')
    try { await selectionApi.hold(applicationId, { reason, reviewDate, holdUntil: reviewDate, comment }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not place on hold'); setSaving(false) }
  }

  return (
    <DialogShell title="Put on Hold" description="A reminder to revisit this candidate — not a decision." error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Place on Hold" confirmDisabled={!reason || !reviewDate}>
      <Field label="Reason" required>
        <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason</option>
          {SELECTION_HOLD_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Review Date" required>
        <input type="date" className="input-field" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
      </Field>
      <Field label="Comment">
        <textarea className="input-field min-h-16" value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
    </DialogShell>
  )
}

// item 7 — Reject: reason + optional "Add to Talent Pool?"
export function SelectionRejectDialog({ applicationId, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [addToTalentPool, setAddToTalentPool] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const needsComment = reason === 'Other'

  async function confirm() {
    if (!reason) return setError('A reason is required')
    if (needsComment && !comment.trim()) return setError('A comment is required when the reason is "Other"')
    setSaving(true); setError('')
    try { await selectionApi.reject(applicationId, { reason, comment: comment.trim() || undefined, addToTalentPool }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not reject'); setSaving(false) }
  }

  return (
    <DialogShell title="Reject Candidate" danger error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Reject" confirmDisabled={!reason}>
      <Field label="Reason" required>
        <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason</option>
          {REJECTION_REASON_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label={`Comment ${needsComment ? '*' : ''}`}>
        <textarea className="input-field min-h-16" value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={addToTalentPool} onChange={(e) => setAddToTalentPool(e.target.checked)} />
        Add to Talent Pool for future opportunities?
      </label>
    </DialogShell>
  )
}

// Approval actions — Approve / Reject Approval on the pending SELECT
// decision, shown only while the tenant's configured selectionApprovalLevel
// actually put this candidate into SELECTION_APPROVAL_PENDING.
export function SelectionApprovalActions({ decisionId, onDone }) {
  const [busy, setBusy] = useState(false)
  const [showReject, setShowReject] = useState(false)

  async function approve() {
    setBusy(true)
    try { await selectionApi.approve(decisionId, ''); onDone() } catch (err) { alert(err.response?.data?.message || 'Could not approve'); setBusy(false) }
  }

  return (
    <div className="flex items-center gap-2">
      <button disabled={busy} onClick={approve} className="btn-primary !bg-emerald-600 hover:!bg-emerald-700">Approve Selection</button>
      <button disabled={busy} onClick={() => setShowReject(true)} className="btn-secondary">Reject Selection</button>
      {showReject && (
        <RejectApprovalDialog decisionId={decisionId} onClose={() => setShowReject(false)} onDone={onDone} />
      )}
    </div>
  )
}

function RejectApprovalDialog({ decisionId, onClose, onDone }) {
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!comment.trim()) return setError('A comment is required')
    setSaving(true); setError('')
    try { await selectionApi.rejectApproval(decisionId, comment.trim()); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not reject this selection'); setSaving(false) }
  }

  return (
    <DialogShell title="Reject Selection" danger error={error} saving={saving} onClose={onClose} onConfirm={confirm} confirmLabel="Reject Selection" confirmDisabled={!comment.trim()}>
      <Field label="Comment" required>
        <textarea className="input-field min-h-16" value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
    </DialogShell>
  )
}
