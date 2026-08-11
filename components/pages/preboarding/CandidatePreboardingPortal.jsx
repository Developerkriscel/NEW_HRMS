'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Plus, Trash2, Upload, FileText, Clock } from 'lucide-react'
import { publicPreboardingApi } from '@/services/publicPreboardingApi'
import { PREBOARDING_FORM_SECTIONS } from '@/lib/preboardingConstants'
import { cn } from '@/lib/utils'

function Card({ children, className }) {
  return <div className={cn('max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8', className)}>{children}</div>
}
function Centered({ children }) {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">{children}</div>
}
function Field({ label, required, className, children }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label} {required && <span className="text-red-500">*</span>}</span>
      {children}
    </label>
  )
}
const inputClass = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-400'

export function CandidatePreboardingPortal({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('form') // form | documents
  const [submitted, setSubmitted] = useState(false)

  function load() {
    setLoading(true)
    publicPreboardingApi.get(token)
      .then((res) => { setData(res.data.data); setView(res.data.data.formStatus === 'APPROVED' ? 'documents' : 'form') })
      .catch((err) => setError(err.response?.data?.message || 'This form link is invalid'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  if (loading) return <Centered><p className="text-slate-400">Loading...</p></Centered>
  if (error) return <Centered><Card className="text-center"><XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 dark:text-slate-400">{error}</p></Card></Centered>
  if (!data) return null
  if (data.isCancelled) return <Centered><Card className="text-center"><XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" /><h1 className="font-bold text-slate-800 dark:text-slate-100">This preboarding process is no longer active</h1></Card></Centered>

  if (submitted || data.formStatus === 'SUBMITTED') {
    return (
      <Centered>
        <Card className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4"><Clock className="w-7 h-7 text-emerald-500" /></div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Information Submitted</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Thank you, {data.candidateName}. Our HR team is reviewing your information and will be in touch if anything needs correction.</p>
        </Card>
      </Centered>
    )
  }

  if (view === 'documents') {
    return <DocumentsView token={token} candidateName={data.candidateName} />
  }

  return <InformationForm token={token} data={data} onSubmitted={() => setSubmitted(true)} onSaved={load} />
}

function InformationForm({ token, data, onSubmitted, onSaved }) {
  const [personal, setPersonal] = useState({
    fullLegalName: data.personal?.fullLegalName || data.autoFill.personalSuggested.fullLegalName || '',
    preferredName: data.personal?.preferredName || '',
    dateOfBirth: data.personal?.dateOfBirth?.slice(0, 10) || '',
    personalEmail: data.personal?.personalEmail || data.autoFill.personalSuggested.personalEmail || '',
    mobileNumber: data.personal?.mobileNumber || data.autoFill.personalSuggested.mobileNumber || '',
    currentAddress: data.personal?.currentAddress || data.autoFill.personalSuggested.currentAddress || '',
    permanentAddress: data.personal?.permanentAddress || '',
  })
  const [emergencyContact, setEmergencyContact] = useState({
    contactName: data.emergencyContact?.contactName || '', relationship: data.emergencyContact?.relationship || '',
    phone: data.emergencyContact?.phone || '', alternatePhone: data.emergencyContact?.alternatePhone || '',
  })
  const [employmentHistory, setEmploymentHistory] = useState(
    (data.employmentHistory?.length ? data.employmentHistory : data.autoFill.employmentHistorySuggested).map((e) => ({
      employerName: e.employerName || '', designation: e.designation || '',
      startDate: e.startDate?.slice(0, 10) || '', endDate: e.endDate?.slice(0, 10) || '',
      employeeId: e.employeeId || '', reasonForLeaving: e.reasonForLeaving || '',
    }))
  )
  const [education, setEducation] = useState(
    (data.education?.length ? data.education : data.autoFill.educationSuggested).map((e) => ({
      degree: e.degree || '', specialization: e.specialization || '', institution: e.institution || '',
      university: e.university || '', startYear: e.startYear || '', completionYear: e.completionYear || '', score: e.score || '',
    }))
  )
  const [bank, setBank] = useState({
    accountHolderName: data.bank?.accountHolderName || '', bankName: data.bank?.bankName || '',
    bankAccountNumber: data.bank?.bankAccountNumber || '', confirmAccountNumber: data.bank?.bankAccountNumber || '', bankIfscCode: data.bank?.bankIfscCode || '', bankBranch: data.bank?.bankBranch || '',
  })
  const [statutory, setStatutory] = useState({
    panNumber: data.statutory?.panNumber || '', uanNumber: data.statutory?.uanNumber || '',
    previousPfMember: data.statutory?.previousPfMember ?? null,
  })
  const [joining, setJoining] = useState({
    availableToJoin: data.joining.availableToJoin, relocationRequired: data.joining.relocationRequired,
    accommodationRequired: data.joining.accommodationRequired,
    requestedJoiningDate: data.joining.requestedJoiningDate?.slice(0, 10) || '', requestedJoiningReason: data.joining.requestedJoiningReason || '',
  })
  const [declarationAccurate, setDeclarationAccurate] = useState(data.personal?.declarationAccurate || false)
  const [declarationWillNotify, setDeclarationWillNotify] = useState(data.personal?.declarationWillNotify || false)
  const [cannotJoin, setCannotJoin] = useState(!!data.joining.requestedJoiningDate)

  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function buildPayload() {
    return {
      personal,
      emergencyContact,
      employmentHistory: employmentHistory.filter((e) => e.employerName),
      education: education.filter((e) => e.degree),
      bank: bank.bankAccountNumber === bank.confirmAccountNumber ? { ...bank } : bank,
      statutory,
      joining: {
        availableToJoin: joining.availableToJoin, relocationRequired: joining.relocationRequired, accommodationRequired: joining.accommodationRequired,
        requestedJoiningDate: cannotJoin ? joining.requestedJoiningDate || null : null,
        requestedJoiningReason: cannotJoin ? joining.requestedJoiningReason || null : null,
      },
    }
  }

  async function saveDraft() {
    setSaving(true); setError(''); setSaved(false)
    try { await publicPreboardingApi.saveDraft(token, buildPayload()); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    catch (err) { setError(err.response?.data?.message || 'Could not save draft') } finally { setSaving(false) }
  }

  async function submit() {
    if (bank.bankAccountNumber && bank.bankAccountNumber !== bank.confirmAccountNumber) return setError('Bank account numbers do not match')
    if (!declarationAccurate || !declarationWillNotify) return setError('Please confirm both declaration checkboxes')
    setSubmitting(true); setError('')
    try {
      await publicPreboardingApi.saveDraft(token, { ...buildPayload(), personal: { ...personal, declarationAccurate, declarationWillNotify } })
      await publicPreboardingApi.submit(token)
      onSubmitted()
    } catch (err) { setError(err.response?.data?.message || 'Could not submit'); setSubmitting(false) }
  }

  const ed = data.autoFill.employmentDetails

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Welcome, {data.candidateName}</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Candidate Information Form</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please complete every section below. You can save your progress and come back later.</p>
        </div>

        {data.correctionRequest && (
          <div className="px-5 py-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-semibold mb-1">HR requested a correction on: {data.correctionRequest.fields.map((f) => PREBOARDING_FORM_SECTIONS.find((s) => s.key === f)?.label || f).join(', ')}</p>
            <p>"{data.correctionRequest.comment}"</p>
          </div>
        )}

        {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        <SectionCard title="Personal Information">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Legal Name" required className="col-span-2"><input className={inputClass} value={personal.fullLegalName} onChange={(e) => setPersonal((p) => ({ ...p, fullLegalName: e.target.value }))} /></Field>
            <Field label="Preferred Name"><input className={inputClass} value={personal.preferredName} onChange={(e) => setPersonal((p) => ({ ...p, preferredName: e.target.value }))} /></Field>
            <Field label="Date of Birth" required><input type="date" className={inputClass} value={personal.dateOfBirth} onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))} /></Field>
            <Field label="Personal Email" required><input type="email" className={inputClass} value={personal.personalEmail} onChange={(e) => setPersonal((p) => ({ ...p, personalEmail: e.target.value }))} /></Field>
            <Field label="Mobile Number" required><input className={inputClass} value={personal.mobileNumber} onChange={(e) => setPersonal((p) => ({ ...p, mobileNumber: e.target.value }))} /></Field>
            <Field label="Current Address" required className="col-span-2"><textarea className={cn(inputClass, 'min-h-16')} value={personal.currentAddress} onChange={(e) => setPersonal((p) => ({ ...p, currentAddress: e.target.value }))} /></Field>
            <Field label="Permanent Address" className="col-span-2"><textarea className={cn(inputClass, 'min-h-16')} value={personal.permanentAddress} onChange={(e) => setPersonal((p) => ({ ...p, permanentAddress: e.target.value }))} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Emergency Contact">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Name" required><input className={inputClass} value={emergencyContact.contactName} onChange={(e) => setEmergencyContact((p) => ({ ...p, contactName: e.target.value }))} /></Field>
            <Field label="Relationship" required><input className={inputClass} value={emergencyContact.relationship} onChange={(e) => setEmergencyContact((p) => ({ ...p, relationship: e.target.value }))} /></Field>
            <Field label="Phone" required><input className={inputClass} value={emergencyContact.phone} onChange={(e) => setEmergencyContact((p) => ({ ...p, phone: e.target.value }))} /></Field>
            <Field label="Alternate Phone"><input className={inputClass} value={emergencyContact.alternatePhone} onChange={(e) => setEmergencyContact((p) => ({ ...p, alternatePhone: e.target.value }))} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Employment Details" description="Prefilled from your accepted offer. If something is wrong, use Request Correction below rather than editing here.">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-slate-400 text-xs">Designation</p><p className="font-medium text-slate-700 dark:text-slate-200">{ed.designation || '—'}</p></div>
            <div><p className="text-slate-400 text-xs">Department</p><p className="font-medium text-slate-700 dark:text-slate-200">{ed.department || '—'}</p></div>
            <div><p className="text-slate-400 text-xs">Location</p><p className="font-medium text-slate-700 dark:text-slate-200">{ed.location || '—'}</p></div>
            <div><p className="text-slate-400 text-xs">Employment Type</p><p className="font-medium text-slate-700 dark:text-slate-200">{ed.employmentType || '—'}</p></div>
            <div><p className="text-slate-400 text-xs">Reporting Manager</p><p className="font-medium text-slate-700 dark:text-slate-200">{ed.reportingManager || '—'}</p></div>
            <div><p className="text-slate-400 text-xs">Joining Date</p><p className="font-medium text-slate-700 dark:text-slate-200">{ed.joiningDate ? new Date(ed.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p></div>
          </div>
        </SectionCard>

        <SectionCard title="Previous Employment">
          <div className="space-y-4">
            {employmentHistory.map((row, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 relative">
                <button type="button" onClick={() => setEmploymentHistory((h) => h.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Employer"><input className={inputClass} value={row.employerName} onChange={(e) => setEmploymentHistory((h) => h.map((r, idx) => idx === i ? { ...r, employerName: e.target.value } : r))} /></Field>
                  <Field label="Designation"><input className={inputClass} value={row.designation} onChange={(e) => setEmploymentHistory((h) => h.map((r, idx) => idx === i ? { ...r, designation: e.target.value } : r))} /></Field>
                  <Field label="Start Date"><input type="date" className={inputClass} value={row.startDate} onChange={(e) => setEmploymentHistory((h) => h.map((r, idx) => idx === i ? { ...r, startDate: e.target.value } : r))} /></Field>
                  <Field label="End Date"><input type="date" className={inputClass} value={row.endDate} onChange={(e) => setEmploymentHistory((h) => h.map((r, idx) => idx === i ? { ...r, endDate: e.target.value } : r))} /></Field>
                  <Field label="Employee ID"><input className={inputClass} value={row.employeeId} onChange={(e) => setEmploymentHistory((h) => h.map((r, idx) => idx === i ? { ...r, employeeId: e.target.value } : r))} /></Field>
                  <Field label="Reason for Leaving"><input className={inputClass} value={row.reasonForLeaving} onChange={(e) => setEmploymentHistory((h) => h.map((r, idx) => idx === i ? { ...r, reasonForLeaving: e.target.value } : r))} /></Field>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setEmploymentHistory((h) => [...h, { employerName: '', designation: '', startDate: '', endDate: '', employeeId: '', reasonForLeaving: '' }])} className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Previous Employment</button>
          </div>
        </SectionCard>

        <SectionCard title="Education">
          <div className="space-y-4">
            {education.map((row, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 relative">
                <button type="button" onClick={() => setEducation((h) => h.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Degree"><input className={inputClass} value={row.degree} onChange={(e) => setEducation((h) => h.map((r, idx) => idx === i ? { ...r, degree: e.target.value } : r))} /></Field>
                  <Field label="Specialization"><input className={inputClass} value={row.specialization} onChange={(e) => setEducation((h) => h.map((r, idx) => idx === i ? { ...r, specialization: e.target.value } : r))} /></Field>
                  <Field label="Institution"><input className={inputClass} value={row.institution} onChange={(e) => setEducation((h) => h.map((r, idx) => idx === i ? { ...r, institution: e.target.value } : r))} /></Field>
                  <Field label="University"><input className={inputClass} value={row.university} onChange={(e) => setEducation((h) => h.map((r, idx) => idx === i ? { ...r, university: e.target.value } : r))} /></Field>
                  <Field label="Start Year"><input type="number" className={inputClass} value={row.startYear} onChange={(e) => setEducation((h) => h.map((r, idx) => idx === i ? { ...r, startYear: e.target.value } : r))} /></Field>
                  <Field label="Completion Year"><input type="number" className={inputClass} value={row.completionYear} onChange={(e) => setEducation((h) => h.map((r, idx) => idx === i ? { ...r, completionYear: e.target.value } : r))} /></Field>
                  <Field label="Score / CGPA" className="col-span-2"><input className={inputClass} value={row.score} onChange={(e) => setEducation((h) => h.map((r, idx) => idx === i ? { ...r, score: e.target.value } : r))} /></Field>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setEducation((h) => [...h, { degree: '', specialization: '', institution: '', university: '', startYear: '', completionYear: '', score: '' }])} className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Education</button>
          </div>
        </SectionCard>

        <SectionCard title="Bank Information" description="Treated as sensitive data — only visible to HR.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account Holder Name"><input className={inputClass} value={bank.accountHolderName} onChange={(e) => setBank((p) => ({ ...p, accountHolderName: e.target.value }))} /></Field>
            <Field label="Bank Name"><input className={inputClass} value={bank.bankName} onChange={(e) => setBank((p) => ({ ...p, bankName: e.target.value }))} /></Field>
            <Field label="Account Number"><input className={inputClass} value={bank.bankAccountNumber} onChange={(e) => setBank((p) => ({ ...p, bankAccountNumber: e.target.value }))} /></Field>
            <Field label="Confirm Account Number"><input className={inputClass} value={bank.confirmAccountNumber} onChange={(e) => setBank((p) => ({ ...p, confirmAccountNumber: e.target.value }))} /></Field>
            <Field label="IFSC"><input className={inputClass} value={bank.bankIfscCode} onChange={(e) => setBank((p) => ({ ...p, bankIfscCode: e.target.value }))} /></Field>
            <Field label="Branch"><input className={inputClass} value={bank.bankBranch} onChange={(e) => setBank((p) => ({ ...p, bankBranch: e.target.value }))} /></Field>
          </div>
          {bank.bankAccountNumber && bank.confirmAccountNumber && bank.bankAccountNumber !== bank.confirmAccountNumber && (
            <p className="text-xs text-red-500 mt-2">Account numbers do not match.</p>
          )}
        </SectionCard>

        <SectionCard title="Statutory / Payroll Information">
          <div className="grid grid-cols-2 gap-3">
            <Field label="PAN"><input className={inputClass} value={statutory.panNumber} onChange={(e) => setStatutory((p) => ({ ...p, panNumber: e.target.value }))} /></Field>
            <Field label="UAN (if applicable)"><input className={inputClass} value={statutory.uanNumber} onChange={(e) => setStatutory((p) => ({ ...p, uanNumber: e.target.value }))} /></Field>
          </div>
          <Field label="Previous PF Member?">
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={statutory.previousPfMember === true} onChange={() => setStatutory((p) => ({ ...p, previousPfMember: true }))} /> Yes</label>
              <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={statutory.previousPfMember === false} onChange={() => setStatutory((p) => ({ ...p, previousPfMember: false }))} /> No</label>
            </div>
          </Field>
        </SectionCard>

        <SectionCard title="Joining Information">
          <div className="space-y-3">
            <YesNo label="Available to Join?" value={joining.availableToJoin} onChange={(v) => setJoining((p) => ({ ...p, availableToJoin: v }))} />
            <YesNo label="Relocation Required?" value={joining.relocationRequired} onChange={(v) => setJoining((p) => ({ ...p, relocationRequired: v }))} />
            <YesNo label="Company Accommodation Required?" value={joining.accommodationRequired} onChange={(v) => setJoining((p) => ({ ...p, accommodationRequired: v }))} />
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 pt-2 border-t border-slate-50 dark:border-slate-800/60">
              <input type="checkbox" checked={cannotJoin} onChange={(e) => setCannotJoin(e.target.checked)} /> I cannot join on the proposed date
            </label>
            {cannotJoin && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Requested Joining Date"><input type="date" className={inputClass} value={joining.requestedJoiningDate} onChange={(e) => setJoining((p) => ({ ...p, requestedJoiningDate: e.target.value }))} /></Field>
                <Field label="Reason" className="col-span-2"><textarea className={cn(inputClass, 'min-h-16')} value={joining.requestedJoiningReason} onChange={(e) => setJoining((p) => ({ ...p, requestedJoiningReason: e.target.value }))} /></Field>
                <p className="col-span-2 text-xs text-amber-600 dark:text-amber-400">HR approval is required before your joining date officially changes.</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Declaration">
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" className="mt-0.5" checked={declarationAccurate} onChange={(e) => setDeclarationAccurate(e.target.checked)} /> The information provided is accurate.</label>
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" className="mt-0.5" checked={declarationWillNotify} onChange={(e) => setDeclarationWillNotify(e.target.checked)} /> I will notify the company if any submitted information changes.</label>
          </div>
        </SectionCard>

        <div className="flex items-center gap-3 justify-end pb-10">
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Draft saved</span>}
          <button onClick={saveDraft} disabled={saving || submitting} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Draft
          </button>
          <button onClick={submit} disabled={saving || submitting} className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Information
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-3">
      <div>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function YesNo({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={value === true} onChange={() => onChange(true)} /> Yes</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={value === false} onChange={() => onChange(false)} /> No</label>
      </div>
    </div>
  )
}

// Step 16 — candidate document checklist, shown once formStatus is APPROVED.
function DocumentsView({ token, candidateName }) {
  const [docs, setDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingId, setUploadingId] = useState(null)

  function load() {
    setLoading(true)
    publicPreboardingApi.get(token).then((res) => setDocs(res.data.data.documents || [])).catch(() => setError('Could not load documents')).finally(() => setLoading(false))
  }
  useEffect(load, [token])

  async function handleUpload(requirementId, file) {
    if (!file) return
    setUploadingId(requirementId); setError('')
    const fd = new FormData()
    fd.append('file', file)
    try { await publicPreboardingApi.uploadDocument(token, requirementId, fd); load() }
    catch (err) { setError(err.response?.data?.message || 'Could not upload file') } finally { setUploadingId(null) }
  }

  if (loading && !docs) return <Centered><p className="text-slate-400">Loading...</p></Centered>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Welcome, {candidateName}</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Documents</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please upload the documents below. We'll let you know if anything needs to be replaced.</p>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800/60">
          {(docs || []).map((doc) => (
            <div key={doc._id} className="p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{doc.name} {!doc.isRequired && <span className="text-xs text-slate-400 font-normal">(Optional)</span>}</p>
                {doc.status === 'REJECTED' && <p className="text-xs text-red-500 mt-0.5">Rejected — {doc.rejectionReason}</p>}
                {doc.status === 'REPLACEMENT_REQUIRED' && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Replacement needed — {doc.rejectionReason}</p>}
                {doc.status === 'VERIFIED' && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</p>}
                {doc.status === 'UNDER_REVIEW' && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><FileText className="w-3 h-3" /> Under Review</p>}
                {doc.status === 'WAIVED' && <p className="text-xs text-purple-500 mt-0.5">Waived</p>}
              </div>
              {['NOT_UPLOADED', 'REJECTED', 'REPLACEMENT_REQUIRED'].includes(doc.status) ? (
                <label className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-300 cursor-pointer text-xs text-slate-500 dark:text-slate-400">
                  {uploadingId === doc.requirementId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {doc.status === 'NOT_UPLOADED' ? 'Upload' : 'Upload Replacement'}
                  <input type="file" className="hidden" onChange={(e) => handleUpload(doc.requirementId, e.target.files?.[0])} />
                </label>
              ) : (
                <span className="flex-shrink-0 text-xs text-slate-400">✓ Uploaded</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
