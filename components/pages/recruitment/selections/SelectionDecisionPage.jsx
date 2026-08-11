'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, RotateCcw, PauseCircle, XCircle, IndianRupee, FileSignature } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { selectionApi } from '@/services/selectionApi'
import { useAuthStore } from '@/store/authStore'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { SELECTION_STATUS, SELECTION_STATUS_LABELS, APPROVAL_STATUS } from '@/lib/selectionConstants'
import { SelectDialog, AdditionalRoundDialog, SelectionHoldDialog, SelectionRejectDialog, SelectionApprovalActions } from './SelectionActionModals'

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

const MANAGE_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']

// items 2-3 — /hr/recruitment/applications/:id/selection: the consolidated
// hiring summary + the four top-level decision actions.
export function SelectionDecisionPage({ applicationId }) {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [dialog, setDialog] = useState(null) // 'select'|'additional-round'|'hold'|'reject'

  function load() {
    setLoading(true)
    selectionApi.getSummary(applicationId)
      .then((res) => setData(res.data.data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [applicationId])

  if (loading) return <PageLoader />
  if (notFound || !data) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Application not found</h3>
        <Link href="/hr/recruitment/selections" className="btn-secondary mx-auto w-fit">Back to Selections</Link>
      </div>
    )
  }

  const candidate = data.candidateId
  const job = data.jobId
  const canManage = MANAGE_ROLES.includes(user?.role)
  const pendingDecision = (data.decisionHistory || []).find((d) => d.decision === 'SELECT' && d.approvalStatus === APPROVAL_STATUS.PENDING)
  const isTerminal = ['REJECTED', 'WITHDRAWN'].includes(data.status)

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href="/hr/recruitment/selections" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Selections
      </Link>

      <div className="page-header">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{data.applicationCode}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{candidate?.firstName} {candidate?.lastName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{job?.publicTitle || job?.jobTitle}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={data.status}>{data.status?.replace('_', ' ')}</Badge>
            {data.selectionStatus && <Badge variant={data.selectionStatus}>{SELECTION_STATUS_LABELS[data.selectionStatus] || data.selectionStatus}</Badge>}
            {data.readyForOffer && <Badge variant="READY_FOR_OFFER">Ready for Offer</Badge>}
          </div>
        </div>
        {data.readyForOffer ? (
          <Link href={`/hr/recruitment/offers/new?applicationId=${applicationId}`} className="btn-primary"><FileSignature className="w-4 h-4" /> Generate Offer</Link>
        ) : data.selectionStatus === SELECTION_STATUS.SELECTED || data.selectionStatus === SELECTION_STATUS.SELECTION_APPROVED ? (
          <Link href={`/hr/recruitment/applications/${applicationId}/compensation`} className="btn-primary"><IndianRupee className="w-4 h-4" /> Prepare Compensation</Link>
        ) : null}
      </div>

      {data.vacancy?.warning && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">⚠ {data.vacancy.warning}</div>
      )}

      {pendingDecision && canManage && (
        <SectionCard title="Selection Awaiting Approval">
          <p className="text-sm text-slate-500 dark:text-slate-400">This selection was recorded by {pendingDecision.decidedByName} on {formatDate(pendingDecision.decidedAt, 'dd MMM yyyy')} and needs {pendingDecision.approvalLevel === 'HIRING_MANAGER' ? 'hiring manager' : 'company admin'} approval before it counts as Selected.</p>
          <SelectionApprovalActions decisionId={pendingDecision._id} onDone={load} />
        </SectionCard>
      )}

      {canManage && !isTerminal && (
        <SectionCard title="Hiring Decision">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDialog('select')} className="btn-primary !bg-emerald-600 hover:!bg-emerald-700"><CheckCircle2 className="w-4 h-4" /> Select</button>
            <button onClick={() => setDialog('additional-round')} className="btn-secondary"><RotateCcw className="w-3.5 h-3.5 text-indigo-500" /> Additional Round</button>
            <button onClick={() => setDialog('hold')} className="btn-secondary"><PauseCircle className="w-3.5 h-3.5 text-amber-500" /> Put on Hold</button>
            <button onClick={() => setDialog('reject')} className="btn-secondary"><XCircle className="w-3.5 h-3.5 text-red-500" /> Reject</button>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Candidate Profile">
          <Row label="Current Company" value={candidate?.currentCompany} />
          <Row label="Total Experience" value={candidate?.totalExperience != null ? `${candidate.totalExperience} yrs` : null} />
          <Row label="Expected CTC" value={candidate?.expectedCtc != null ? `₹${candidate.expectedCtc}L` : null} />
          <Row label="Current CTC" value={candidate?.currentCtc != null ? `₹${candidate.currentCtc}L` : null} />
          <Row label="Notice Period" value={candidate?.noticePeriod} />
          <Row label="Location" value={candidate?.currentLocation} />
        </SectionCard>

        <SectionCard title="Job Requirement Match">
          <Row label="AI Match Score" value={data.aiMatch ? `${data.aiMatch.overallScore}% (${data.aiMatch.matchLabel})` : 'Not generated'} />
          <Row label="Assessment Score" value={data.assessmentScore ? `${data.assessmentScore.percentage}% — ${data.assessmentScore.result}` : 'Not taken'} />
          <Row label="Final Interview Score" value={data.finalInterviewScore != null ? `${data.finalInterviewScore}/10` : 'No feedback yet'} />
          <Row label="Screening" value={data.screeningResult === 'NEEDS_REVIEW' ? 'Needs Review' : 'Passed'} />
        </SectionCard>
      </div>

      <SectionCard title="Interview Rounds & Panel Feedback">
        {(data.interviewRounds || []).length === 0 ? (
          <p className="text-sm text-slate-400">No interview rounds recorded.</p>
        ) : (
          <div className="space-y-3">
            {data.interviewRounds.map((iv) => (
              <div key={iv._id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{iv.roundName}</p>
                  <Badge variant={iv.status}>{iv.status?.replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-slate-400 mb-1">{formatDate(iv.date, 'dd MMM yyyy')}</p>
                {(iv.feedback || []).map((f) => (
                  <p key={f._id} className="text-xs text-slate-500 dark:text-slate-400">{f.interviewerName}: {f.overallRating}/10 — {f.recommendation?.replace('_', ' ')}</p>
                ))}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Decision History">
        {(data.decisionHistory || []).length === 0 ? (
          <p className="text-sm text-slate-400">No decisions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {data.decisionHistory.map((d) => (
              <div key={d._id} className="text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-2">
                  <Badge variant={d.decision}>{d.decision.replace('_', ' ')}</Badge>
                  <span className="text-xs text-slate-400">{formatRelativeTime(d.decidedAt)} · {d.decidedByName}</span>
                </div>
                {(d.decisionReason || d.comments) && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{d.decisionReason}{d.comments ? ` — ${d.comments}` : ''}</p>}
                {d.approvalStatus && d.approvalStatus !== 'NOT_REQUIRED' && (
                  <p className="text-xs text-slate-400 mt-0.5">Approval: {d.approvalStatus}{d.approvedByName ? ` by ${d.approvedByName}` : ''}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {dialog === 'select' && <SelectDialog applicationId={applicationId} vacancy={data.vacancy} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
      {dialog === 'additional-round' && <AdditionalRoundDialog applicationId={applicationId} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
      {dialog === 'hold' && <SelectionHoldDialog applicationId={applicationId} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
      {dialog === 'reject' && <SelectionRejectDialog applicationId={applicationId} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
    </div>
  )
}
