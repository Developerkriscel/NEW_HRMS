'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, FileSignature } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { compensationApi } from '@/services/compensationApi'
import { formatRelativeTime } from '@/lib/utils'
import { COMPENSATION_STATUS, COMPENSATION_STATUS_LABELS } from '@/lib/compensationConstants'
import { useAuthStore } from '@/store/authStore'
import { computeBudgetFit } from './compensationClientHelpers'
import { CompensationProposalForm } from './CompensationProposalForm'
import { CompensationApprovalActions } from './CompensationApprovalActions'

function SectionCard({ title, children }) {
  return (
    <div className="stat-card space-y-3">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
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

const EDITABLE_STATUSES = [COMPENSATION_STATUS.DRAFT, COMPENSATION_STATUS.REVISION_REQUESTED, COMPENSATION_STATUS.REJECTED]
const MANAGE_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']

// items 1-4 — the Compensation Proposal screen for one application: prepare
// a proposal, compare to job budget, submit for approval, and (for an
// approver) act on it. item 9's versioning ("never overwrite") is what the
// history section at the bottom renders.
export function CompensationPage({ applicationId }) {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState(null)
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true); setError('')
    compensationApi.getForApplication(applicationId)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.status === 403 ? 'You do not have permission to view compensation for this application.' : 'Could not load compensation details.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [applicationId])
  useEffect(() => { compensationApi.listSalaryStructures().then((res) => setStructures(res.data.data || [])).catch(() => {}) }, [])

  async function submitForApproval() {
    setSubmitting(true)
    try { await compensationApi.submit(data.latest._id); load() }
    catch (err) { alert(err.response?.data?.message || 'Could not submit for approval'); setSubmitting(false) }
  }

  if (loading) return <PageLoader />
  if (error) {
    return (
      <div className="stat-card text-center py-16">
        <p className="text-slate-500 dark:text-slate-400">{error}</p>
        <Link href={`/hr/recruitment/applications/${applicationId}/selection`} className="btn-secondary mx-auto w-fit mt-4">Back</Link>
      </div>
    )
  }

  const { application, latest, history, budgetFit, increase } = data
  const candidate = application.candidate
  const job = application.job
  const canManage = MANAGE_ROLES.includes(user?.role)
  const canEdit = canManage && (!latest || EDITABLE_STATUSES.includes(latest.status))
  const liveBudgetFit = latest ? computeBudgetFit(latest.totalCtc, job?.internalMinCtc, job?.internalMaxCtc) : null

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <Link href={`/hr/recruitment/applications/${applicationId}/selection`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Selection
      </Link>

      <div className="page-header">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{application.applicationCode}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compensation — {candidate?.firstName} {candidate?.lastName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{job?.publicTitle || job?.jobTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {latest && <Badge variant={latest.status}>{COMPENSATION_STATUS_LABELS[latest.status] || latest.status}</Badge>}
          {application.readyForOffer && <Badge variant="READY_FOR_OFFER">Ready for Offer</Badge>}
          {application.readyForOffer && (
            <Link href={`/hr/recruitment/offers/new?applicationId=${applicationId}`} className="btn-primary"><FileSignature className="w-4 h-4" /> Generate Offer</Link>
          )}
        </div>
      </div>

      <SectionCard title="Job Budget">
        <Row label="Approved Budget Range" value={job?.internalMinCtc != null || job?.internalMaxCtc != null ? `₹${job.internalMinCtc ?? '—'}L – ₹${job.internalMaxCtc ?? '—'}L` : 'Not set'} />
        <Row label="Candidate Current CTC" value={candidate?.currentCtc != null ? `₹${candidate.currentCtc}L` : null} />
        <Row label="Candidate Expected CTC" value={candidate?.expectedCtc != null ? `₹${candidate.expectedCtc}L` : null} />
      </SectionCard>

      {latest && (
        <SectionCard title={`Proposal V${latest.version} — Budget & Increase Analysis`}>
          <Row label="Total Proposed CTC" value={`₹${latest.totalCtc}L`} />
          <Row label="Budget Fit" value={liveBudgetFit?.withinBudget ? '✓ Within Budget' : `⚠ ₹${liveBudgetFit?.variance}L above approved budget (${liveBudgetFit?.variancePercent}%)`} />
          {increase?.increasePercent != null && <Row label="Increase over Current CTC" value={`${increase.increasePercent}%`} />}
          {increase?.expectedDeltaPercent != null && <Row label="vs Expected CTC" value={`${increase.expectedDelta >= 0 ? '+' : ''}₹${increase.expectedDelta}L (${increase.expectedDeltaPercent}%)`} />}

          {!canEdit && latest.status === COMPENSATION_STATUS.PENDING_APPROVAL && (
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-2">Awaiting {latest.currentApprovalStage?.replace('_', ' ')} approval.</p>
              <CompensationApprovalActions proposalId={latest._id} onDone={load} />
            </div>
          )}
        </SectionCard>
      )}

      {canEdit && (
        <SectionCard title={latest ? (latest.status === COMPENSATION_STATUS.DRAFT ? `Edit Proposal V${latest.version}` : `Revise Proposal (will become V${latest.version + 1})`) : 'Prepare Compensation'}>
          {latest?.status === COMPENSATION_STATUS.REVISION_REQUESTED && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
              Revision requested on V{latest.version} — suggested ₹{latest.revisionSuggestedCtc}L. {latest.revisionComment}
            </div>
          )}
          {latest?.status === COMPENSATION_STATUS.REJECTED && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              V{latest.version} was rejected — {latest.rejectionReason}
            </div>
          )}
          <CompensationProposalForm
            applicationId={applicationId}
            seed={latest?.status === COMPENSATION_STATUS.DRAFT ? latest : (latest?.status === COMPENSATION_STATUS.REVISION_REQUESTED ? { ...latest, fixedPay: latest.revisionSuggestedCtc } : null)}
            structures={structures}
            onSaved={load}
          />
          {latest?.status === COMPENSATION_STATUS.DRAFT && (
            <div className="flex justify-end pt-2">
              <button onClick={submitForApproval} disabled={submitting} className="btn-primary">{submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit for Approval</button>
            </div>
          )}
        </SectionCard>
      )}

      {history && history.length > 1 && (
        <SectionCard title="Version History">
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h._id} className="flex items-center justify-between text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
                <span className="text-slate-600 dark:text-slate-300">V{h.version} — ₹{h.totalCtc}L</span>
                <div className="flex items-center gap-2">
                  <Badge variant={h.status}>{COMPENSATION_STATUS_LABELS[h.status] || h.status}</Badge>
                  <span className="text-xs text-slate-400">{formatRelativeTime(h.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
