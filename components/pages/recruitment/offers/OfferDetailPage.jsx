'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Eye, Send, FileDown, Copy, Check, UserCheck } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { offerApi } from '@/services/offerApi'
import { useAuthStore } from '@/store/authStore'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { OFFER_STATUS, OFFER_STATUS_LABELS } from '@/lib/offerConstants'
import { OfferApprovalActions, WithdrawOfferDialog, ExtendExpiryDialog } from './OfferActionModals'
import { OfferPreviewModal } from './OfferPreviewModal'

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

export function OfferDetailPage({ offerId }) {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [dialog, setDialog] = useState(null) // 'withdraw' | 'extend'
  const [sentUrl, setSentUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  function load() {
    setLoading(true)
    offerApi.get(offerId).then((res) => setData(res.data.data)).catch((err) => { if (err.response?.status === 404) setNotFound(true) }).finally(() => setLoading(false))
  }
  useEffect(load, [offerId])

  if (loading) return <PageLoader />
  if (notFound || !data) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Offer not found</h3>
        <Link href="/hr/recruitment/offers" className="btn-secondary mx-auto w-fit">Back to Offers</Link>
      </div>
    )
  }

  const { currentVersion: v, history, status, jobId: job, candidateId: candidate } = data
  const canManage = MANAGE_ROLES.includes(user?.role)
  const canApprove = MANAGE_ROLES.includes(user?.role) // exact eligibility re-checked server-side

  async function submit() {
    setBusy(true); setError('')
    try { await offerApi.submit(offerId); load() } catch (err) { setError(err.response?.data?.message || 'Could not submit') } finally { setBusy(false) }
  }
  async function generatePdf() {
    setBusy(true); setError('')
    try { await offerApi.generatePdf(offerId); load() } catch (err) { setError(err.response?.data?.message || 'Could not generate PDF') } finally { setBusy(false) }
  }
  async function send() {
    setBusy(true); setError('')
    try {
      const res = await offerApi.send(offerId)
      setSentUrl(`${window.location.origin}${res.data.data.portalUrl}`)
      load()
    } catch (err) { setError(err.response?.data?.message || 'Could not send') } finally { setBusy(false) }
  }
  function copyLink() {
    navigator.clipboard.writeText(sentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <Link href="/hr/recruitment/offers" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Offers
      </Link>

      <div className="page-header">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{data.offerCode} {v && `· V${v.version}`}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{candidate?.firstName} {candidate?.lastName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{job?.publicTitle || job?.jobTitle}</p>
        </div>
        <Badge variant={status}>{OFFER_STATUS_LABELS[status] || status}</Badge>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      {sentUrl && (
        <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm space-y-2">
          <p className="text-blue-700 dark:text-blue-400 font-medium">Offer sent — share this secure link with the candidate (no email delivery is wired up yet, so copy/share it directly):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 truncate">{sentUrl}</code>
            <button onClick={copyLink} className="btn-secondary !text-xs !py-1.5">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}

      {data.withdrawalReason && <div className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">Withdrawn — {data.withdrawalReason}</div>}
      {data.declineReason && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">Declined by candidate — {data.declineReason}{data.declineComment ? `: ${data.declineComment}` : ''}</div>}
      {data.discussionRequestedAt && status !== OFFER_STATUS.ACCEPTED && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400 space-y-1">
          <p className="font-medium">Candidate requested a discussion ({formatRelativeTime(data.discussionRequestedAt)})</p>
          {data.discussionRequestedCtc != null && <p>Expected CTC: ₹{data.discussionRequestedCtc}L</p>}
          {data.discussionRequestedJoiningDate && <p>Preferred Joining: {formatDate(data.discussionRequestedJoiningDate, 'dd MMM yyyy')}</p>}
          {data.discussionComment && <p>"{data.discussionComment}"</p>}
          <Link href={`/hr/recruitment/offers/new?applicationId=${data.applicationId}`} className="btn-secondary !text-xs !py-1.5 mt-1 inline-flex">Create New Version</Link>
        </div>
      )}

      {status === OFFER_STATUS.DRAFT && canManage && (
        <SectionCard title="This offer is a draft">
          <div className="flex flex-wrap gap-2">
            <Link href={`/hr/recruitment/offers/new?applicationId=${data.applicationId}`} className="btn-secondary">Edit</Link>
            <button onClick={submit} disabled={busy} className="btn-primary">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit for Approval</button>
          </div>
        </SectionCard>
      )}

      {status === OFFER_STATUS.REVISION_REQUESTED && canManage && (
        <SectionCard title="Revision needed">
          {v?.rejectionReason && <p className="text-sm text-red-500 mb-2">Rejected — {v.rejectionReason}</p>}
          {v?.revisionComment && <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Revision requested — {v.revisionComment}</p>}
          <Link href={`/hr/recruitment/offers/new?applicationId=${data.applicationId}`} className="btn-primary">Create New Version</Link>
        </SectionCard>
      )}

      {status === OFFER_STATUS.PENDING_APPROVAL && canApprove && (
        <SectionCard title="Awaiting Internal Approval">
          <OfferApprovalActions offerId={offerId} onDone={load} />
        </SectionCard>
      )}

      {status === OFFER_STATUS.APPROVED && canManage && (
        <SectionCard title="Approved — Ready to Send">
          <div className="flex flex-wrap gap-2">
            <button onClick={generatePdf} disabled={busy} className="btn-secondary"><FileDown className="w-4 h-4" /> {v?.pdfUrl ? 'Regenerate PDF' : 'Generate PDF'}</button>
            <button onClick={send} disabled={busy} className="btn-primary"><Send className="w-4 h-4" /> Send Offer</button>
          </div>
        </SectionCard>
      )}

      {[OFFER_STATUS.SENT, OFFER_STATUS.VIEWED, OFFER_STATUS.EXPIRED].includes(status) && canManage && (
        <SectionCard title="Offer Sent — Tracking">
          <Row label="Sent" value={data.sentAt ? formatDate(data.sentAt, 'dd MMM yyyy · hh:mm a') : '—'} />
          <Row label="Viewed" value={data.viewedAt ? formatDate(data.viewedAt, 'dd MMM yyyy · hh:mm a') : 'Not yet viewed'} />
          <Row label="Valid Until" value={data.expiresAt ? formatDate(data.expiresAt, 'dd MMM yyyy') : '—'} />
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => setDialog('extend')} className="btn-secondary">Extend Expiry</button>
            <button onClick={() => setDialog('withdraw')} className="btn-secondary !text-red-600">Withdraw</button>
          </div>
        </SectionCard>
      )}

      {status === OFFER_STATUS.ACCEPTED && (
        <SectionCard title="Offer Accepted 🎉">
          <Row label="Accepted By" value={data.acceptedName} />
          <Row label="Accepted On" value={data.acceptedAt ? formatDate(data.acceptedAt, 'dd MMM yyyy · hh:mm a') : '—'} />
          <Row label="Signature Reference" value={data.signatureReference} />
          {data.preboardingId ? (
            <Link href={`/hr/onboarding/${data.preboardingId}`} className="btn-primary mt-3 w-fit"><UserCheck className="w-4 h-4" /> View Preboarding</Link>
          ) : (
            <p className="text-xs text-slate-400 pt-2">A Preboarding record has been created for this candidate.</p>
          )}
        </SectionCard>
      )}

      {v && (
        <SectionCard title={`Offer Terms — V${v.version}`} action={<button onClick={() => setPreviewing(true)} className="btn-secondary !text-xs !py-1.5"><Eye className="w-3.5 h-3.5" /> Preview</button>}>
          <Row label="Designation" value={v.designationId?.name} />
          <Row label="Department" value={v.departmentId?.name} />
          <Row label="Reporting Manager" value={v.managerId ? `${v.managerId.firstName} ${v.managerId.lastName}` : null} />
          <Row label="Location" value={v.locationId?.name} />
          <Row label="Employment Type" value={v.employmentType} />
          <Row label="Work Mode" value={v.workMode} />
          <Row label="Annual CTC" value={v.ctc != null ? `₹${v.ctc}L` : null} />
          <Row label="Joining Date" value={v.joiningDate ? formatDate(v.joiningDate, 'dd MMM yyyy') : null} />
          <Row label="Probation Period" value={v.probationPeriod} />
          <Row label="Notice Period" value={v.noticePeriod} />
          <Row label="Offer Valid Until" value={v.offerValidUntil ? formatDate(v.offerValidUntil, 'dd MMM yyyy') : null} />
        </SectionCard>
      )}

      {history?.length > 1 && (
        <SectionCard title="Offer Version History">
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h._id} className="flex items-center justify-between text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
                <span className="text-slate-600 dark:text-slate-300">V{h.version} — ₹{h.ctc}L, joining {formatDate(h.joiningDate, 'dd MMM yyyy')}</span>
                <Badge variant={h.status}>{h.status.replace('_', ' ')}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {previewing && v && (
        <OfferPreviewModal
          content={v.renderedContent}
          variables={{}}
          onClose={() => setPreviewing(false)}
        />
      )}
      {dialog === 'withdraw' && <WithdrawOfferDialog offerId={offerId} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
      {dialog === 'extend' && <ExtendExpiryDialog offerId={offerId} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load() }} />}
    </div>
  )
}
