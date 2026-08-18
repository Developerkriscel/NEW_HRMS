'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Loader2, Copy, Check, UserPlus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { preboardingApi } from '@/services/preboardingApi'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { PREBOARDING_STATUS_LABELS, FORM_STATUS_LABELS, FORM_STATUS, PREBOARDING_FORM_SECTIONS } from '@/lib/preboardingConstants'
import { DocumentsTab } from './DocumentsTab'
import { RequestCorrectionDialog, ChangeJoiningDateDialog, CancelPreboardingDialog } from './OnboardingActionModals'

function SectionCard({ title, children, action }) {
  return (
    <div className="stat-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm py-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 dark:text-slate-200 font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

const TABS = ['Overview', 'Candidate Information', 'Documents', 'Verification', 'Offer', 'Activity']

export function OnboardingDetailPage({ id }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [sentUrl, setSentUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  function load() {
    setLoading(true)
    preboardingApi.get(id).then((res) => setData(res.data.data)).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  async function sendForm() {
    setBusy(true)
    try {
      const res = await preboardingApi.sendForm(id)
      setSentUrl(`${window.location.origin}${res.data.data.portalUrl}`)
      load()
    } catch (err) { alert(err.response?.data?.message || 'Could not send form') } finally { setBusy(false) }
  }
  function copyLink() {
    navigator.clipboard.writeText(sentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function approveInformation() {
    setBusy(true)
    try { await preboardingApi.approveInformation(id); load() } catch (err) { alert(err.response?.data?.message || 'Could not approve'); } finally { setBusy(false) }
  }

  if (loading) return <PageLoader />
  if (!data) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Preboarding profile not found</h3>
        <Link href="/hr/onboarding" className="btn-secondary mx-auto w-fit">Back to Preboarding</Link>
      </div>
    )
  }

  const candidate = data.candidateId
  const job = data.jobId
  const requiredDocs = (data.documents || []).filter((d) => d.isRequired)
  const milestones = [
    { label: 'Offer Accepted', done: true },
    { label: 'Information Form', done: data.formStatus === FORM_STATUS.APPROVED, percent: data.formStatus === FORM_STATUS.APPROVED ? 100 : null },
    { label: 'Documents', done: data.documentStatus === 'COMPLETE', percent: requiredDocs.length ? Math.round((requiredDocs.filter((d) => d.status !== 'NOT_UPLOADED').length / requiredDocs.length) * 100) : null },
    { label: 'HR Verification', done: data.verificationStatus === 'COMPLETE', percent: requiredDocs.length ? Math.round((requiredDocs.filter((d) => ['VERIFIED', 'WAIVED'].includes(d.status)).length / requiredDocs.length) * 100) : null },
  ]

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href="/hr/onboarding" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Preboarding
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{candidate?.firstName} {candidate?.lastName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{job?.publicTitle || job?.jobTitle}</p>
          <p className="text-xs text-slate-400 mt-1">Joining Date: {formatDate(data.confirmedJoiningDate || data.proposedJoiningDate, 'dd MMM yyyy')}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={data.status}>{PREBOARDING_STATUS_LABELS[data.status] || data.status}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/hr/onboarding/${id}/joining`} className="btn-primary !text-xs">
            <UserPlus className="w-3.5 h-3.5" /> Joining & Employee Setup
          </Link>
          <button onClick={() => setDialog('joiningDate')} className="btn-secondary !text-xs">Change Joining Date</button>
          <button onClick={() => setDialog('cancel')} className="btn-secondary !text-xs !text-red-600">Cancel Preboarding</button>
        </div>
      </div>

      {sentUrl && (
        <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm space-y-2">
          <p className="text-blue-700 dark:text-blue-400 font-medium">Information form sent — share this secure link with the candidate (no email delivery is wired up yet, so copy/share it directly):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 truncate">{sentUrl}</code>
            <button onClick={copyLink} className="btn-secondary !text-xs !py-1.5">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}

      <div className="border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap', tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Overview' && (
        <>
          <SectionCard title="Progress">
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  {m.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{m.label}</span>
                  <span className="text-xs text-slate-400">{m.done ? '✓' : m.percent != null ? `${m.percent}%` : 'Pending'}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 mt-1 border-t border-slate-50 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500 dark:text-slate-400">Overall Progress</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{data.progressPercentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${data.progressPercentage}%` }} />
              </div>
            </div>
          </SectionCard>

          {data.correctionRequest && data.formStatus === FORM_STATUS.CORRECTION_REQUIRED && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400">
              Awaiting candidate correction on: {data.correctionRequest.fields.map((f) => PREBOARDING_FORM_SECTIONS.find((s) => s.key === f)?.label || f).join(', ')} — "{data.correctionRequest.comment}"
            </div>
          )}

          {data.formStatus === FORM_STATUS.SUBMITTED && (
            <SectionCard title="Information Submitted — Review Required">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Review the Candidate Information tab, then approve or request a correction.</p>
              <div className="flex gap-2">
                <button onClick={approveInformation} disabled={busy} className="btn-primary">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Approve Information</button>
                <button onClick={() => setDialog('correction')} className="btn-secondary">Request Correction</button>
              </div>
            </SectionCard>
          )}

          {data.formStatus === FORM_STATUS.NOT_SENT && (
            <SectionCard title="Information Form Not Sent">
              <button onClick={sendForm} disabled={busy} className="btn-primary">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Send Information Form</button>
            </SectionCard>
          )}
        </>
      )}

      {tab === 'Candidate Information' && <CandidateInformationTab data={data} />}
      {tab === 'Documents' && <DocumentsTab preboardingId={id} documents={data.documents} canViewSensitive={data.canViewSensitive} onChanged={load} />}
      {tab === 'Verification' && <VerificationSummaryTab documents={data.documents} />}
      {tab === 'Offer' && <OfferTab offer={data.offer} />}
      {tab === 'Activity' && <ActivityTab activityLog={data.activityLog} />}

      {dialog === 'correction' && <RequestCorrectionDialog id={id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
      {dialog === 'joiningDate' && <ChangeJoiningDateDialog id={id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
      {dialog === 'cancel' && <CancelPreboardingDialog id={id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
    </div>
  )
}

function CandidateInformationTab({ data }) {
  const p = data.personal
  const ec = data.emergencyContact
  return (
    <div className="space-y-6">
      <SectionCard title="Personal Information">
        <Row label="Full Legal Name" value={p?.fullLegalName} />
        <Row label="Preferred Name" value={p?.preferredName} />
        <Row label="Date of Birth" value={p?.dateOfBirth ? formatDate(p.dateOfBirth, 'dd MMM yyyy') : null} />
        <Row label="Personal Email" value={p?.personalEmail} />
        <Row label="Mobile Number" value={p?.mobileNumber} />
        <Row label="Current Address" value={p?.currentAddress} />
        <Row label="Permanent Address" value={p?.permanentAddress} />
      </SectionCard>

      <SectionCard title="Emergency Contact">
        <Row label="Contact Name" value={ec?.contactName} />
        <Row label="Relationship" value={ec?.relationship} />
        <Row label="Phone" value={ec?.phone} />
        <Row label="Alternate Phone" value={ec?.alternatePhone} />
      </SectionCard>

      <SectionCard title="Previous Employment">
        {(data.employmentHistory || []).length === 0 ? <p className="text-sm text-slate-400">None provided.</p> : (
          <div className="space-y-3">
            {data.employmentHistory.map((e, i) => (
              <div key={i} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-3 last:pb-0 text-sm">
                <p className="font-medium text-slate-700 dark:text-slate-200">{e.designation} at {e.employerName}</p>
                <p className="text-xs text-slate-400">{e.startDate ? formatDate(e.startDate, 'MMM yyyy') : '—'} – {e.endDate ? formatDate(e.endDate, 'MMM yyyy') : '—'} {e.reasonForLeaving ? `· ${e.reasonForLeaving}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Education">
        {(data.education || []).length === 0 ? <p className="text-sm text-slate-400">None provided.</p> : (
          <div className="space-y-3">
            {data.education.map((e, i) => (
              <div key={i} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-3 last:pb-0 text-sm">
                <p className="font-medium text-slate-700 dark:text-slate-200">{e.degree} {e.specialization ? `— ${e.specialization}` : ''}</p>
                <p className="text-xs text-slate-400">{e.institution} {e.university ? `(${e.university})` : ''} · {e.startYear}–{e.completionYear} {e.score ? `· ${e.score}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {data.canViewSensitive ? (
        <>
          <SectionCard title="Bank Information">
            <Row label="Account Holder Name" value={data.bank?.accountHolderName} />
            <Row label="Bank Name" value={data.bank?.bankName} />
            <Row label="Account Number" value={data.bank?.bankAccountNumber} />
            <Row label="IFSC" value={data.bank?.bankIfscCode} />
            <Row label="Branch" value={data.bank?.bankBranch} />
          </SectionCard>
          <SectionCard title="Statutory / Payroll Information">
            <Row label="PAN" value={data.statutory?.panNumber} />
            <Row label="UAN" value={data.statutory?.uanNumber} />
            <Row label="Previously PF Member?" value={data.statutory?.previousPfMember == null ? null : (data.statutory.previousPfMember ? 'Yes' : 'No')} />
          </SectionCard>
        </>
      ) : (
        <SectionCard title="Bank & Statutory Information">
          <p className="text-sm text-slate-400">You do not have permission to view this sensitive information.</p>
        </SectionCard>
      )}

      <SectionCard title="Joining Information">
        <Row label="Available to Join?" value={data.availableToJoin == null ? null : (data.availableToJoin ? 'Yes' : 'No')} />
        <Row label="Relocation Required?" value={data.relocationRequired == null ? null : (data.relocationRequired ? 'Yes' : 'No')} />
        <Row label="Company Accommodation Required?" value={data.accommodationRequired == null ? null : (data.accommodationRequired ? 'Yes' : 'No')} />
        {data.requestedJoiningDate && <Row label="Requested Joining Date" value={formatDate(data.requestedJoiningDate, 'dd MMM yyyy')} />}
        {data.requestedJoiningReason && <Row label="Reason" value={data.requestedJoiningReason} />}
      </SectionCard>

      <SectionCard title="Declaration">
        <Row label="Information Accurate" value={p?.declarationAccurate ? 'Confirmed' : 'Not confirmed'} />
        <Row label="Will Notify Changes" value={p?.declarationWillNotify ? 'Confirmed' : 'Not confirmed'} />
      </SectionCard>
    </div>
  )
}

function VerificationSummaryTab({ documents }) {
  const required = (documents || []).filter((d) => d.isRequired)
  const uploaded = required.filter((d) => d.status !== 'NOT_UPLOADED').length
  const verified = required.filter((d) => ['VERIFIED', 'WAIVED'].includes(d.status)).length
  const pending = required.filter((d) => ['UPLOADED', 'UNDER_REVIEW'].includes(d.status)).length
  const missing = required.filter((d) => d.status === 'NOT_UPLOADED').length
  const stats = [
    { label: 'Required', value: required.length },
    { label: 'Uploaded', value: uploaded },
    { label: 'Verified', value: verified },
    { label: 'Pending', value: pending },
    { label: 'Missing', value: missing },
  ]
  return (
    <SectionCard title="Verification Summary">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center px-3 py-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {(documents || []).filter((d) => ['VERIFIED', 'REJECTED', 'WAIVED'].includes(d.status)).map((d) => (
          <div key={d._id} className="flex items-center justify-between text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
            <span className="text-slate-600 dark:text-slate-300">{d.name}</span>
            <div className="text-right">
              <Badge variant={d.status}>{d.status.replace(/_/g, ' ')}</Badge>
              <p className="text-xs text-slate-400 mt-0.5">{d.verifiedByName || d.waivedByName || ''}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function OfferTab({ offer }) {
  if (!offer) return <SectionCard title="Offer"><p className="text-sm text-slate-400">No offer data available.</p></SectionCard>
  return (
    <SectionCard title={`Accepted Offer — V${offer.version}`}>
      <Row label="Designation" value={offer.designation} />
      <Row label="Department" value={offer.department} />
      <Row label="Location" value={offer.location} />
      <Row label="Reporting Manager" value={offer.reportingManager} />
      <Row label="Employment Type" value={offer.employmentType} />
      <Row label="Work Mode" value={offer.workMode} />
      <Row label="Annual CTC" value={offer.ctc != null ? `₹${offer.ctc}L` : null} />
    </SectionCard>
  )
}

function ActivityTab({ activityLog }) {
  const entries = [...(activityLog || [])].reverse()
  return (
    <SectionCard title="Activity Timeline">
      {entries.length === 0 ? <p className="text-sm text-slate-400">No activity yet.</p> : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={i} className="text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
              <p className="text-slate-700 dark:text-slate-200">{entry.message}</p>
              {entry.comment && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">"{entry.comment}"</p>}
              <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(entry.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
