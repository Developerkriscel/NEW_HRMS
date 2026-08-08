'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil, Send, Check, X, Ban, Briefcase, ArrowLeft, Loader2, Clock,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { requisitionApi } from '@/services/requisitionApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import {
  REQUISITION_STATUS_LABELS, PRIORITY_LABELS,
  EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, HIRING_REASON_LABELS, BUDGET_TYPE_LABELS,
  getAvailableActions,
} from '@/lib/recruitmentConstants'

const PRIORITY_DOT = { LOW: 'bg-slate-400', MEDIUM: 'bg-blue-500', HIGH: 'bg-amber-500', URGENT: 'bg-red-500' }

const ACTIVITY_LABEL = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  SUBMITTED: 'Submitted for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

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

export function RequisitionDetailPage({ requisitionId }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const session = useMemo(() => (user ? { role: user.role, userId: user.id, permissions: user.permissions || [] } : null), [user])
  const canSeeBudget = user?.role !== 'MANAGER'

  const [requisition, setRequisition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dialogType, setDialogType] = useState(null) // submit | approve | reject | cancel
  const [approveComment, setApproveComment] = useState('')

  function load() {
    setLoading(true)
    requisitionApi.get(requisitionId)
      .then((res) => setRequisition(res.data.data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [requisitionId])

  if (loading) return <PageLoader />
  if (notFound || !requisition) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Requisition not found</h3>
        <Link href="/hr/recruitment/requisitions" className="btn-secondary mx-auto w-fit">Back to Requisitions</Link>
      </div>
    )
  }

  const actions = session ? getAvailableActions(requisition, session) : ['view']
  const personName = (p) => (p ? `${p.firstName} ${p.lastName}` : '—')

  async function runAction(type, extra) {
    setBusy(true)
    try {
      if (type === 'submit') {
        await requisitionApi.submit(requisitionId)
        addNotification({ title: 'Submitted for approval', message: `${requisition.requisitionCode} is now awaiting approval`, type: 'info' })
      } else if (type === 'approve') {
        await requisitionApi.approve(requisitionId, extra)
        addNotification({ title: 'Requisition approved', message: `Your requisition ${requisition.requisitionCode} has been approved.`, type: 'success' })
      } else if (type === 'reject') {
        await requisitionApi.reject(requisitionId, extra)
        addNotification({ title: 'Requisition rejected', message: `Your requisition was rejected. Reason: ${extra}`, type: 'warning' })
      } else if (type === 'cancel') {
        await requisitionApi.cancel(requisitionId, extra)
        addNotification({ title: 'Requisition cancelled', message: `${requisition.requisitionCode} was cancelled`, type: 'info' })
      }
      setDialogType(null)
      setApproveComment('')
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href="/hr/recruitment/requisitions" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Requisitions
      </Link>

      <div className="page-header">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{requisition.requisitionCode}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{requisition.jobTitle}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{REQUISITION_STATUS_LABELS[requisition.status] || requisition.status}</Badge>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[requisition.priority])} />
              {PRIORITY_LABELS[requisition.priority]} Priority
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.includes('edit') && (
            <Link href={`/hr/recruitment/requisitions/${requisitionId}/edit`} className="btn-secondary"><Pencil className="w-4 h-4" /> Edit</Link>
          )}
          {actions.includes('submit') && (
            <button className="btn-primary" onClick={() => setDialogType('submit')}><Send className="w-4 h-4" /> Submit</button>
          )}
          {actions.includes('approve') && (
            <button className="btn-primary" onClick={() => setDialogType('approve')}><Check className="w-4 h-4" /> Approve</button>
          )}
          {actions.includes('reject') && (
            <button className="btn-danger" onClick={() => setDialogType('reject')}><X className="w-4 h-4" /> Reject</button>
          )}
          {actions.includes('cancel') && (
            <button className="btn-secondary" onClick={() => setDialogType('cancel')}><Ban className="w-4 h-4" /> Cancel</button>
          )}
          {actions.includes('createJob') && (
            <Link href={`/hr/recruitment/jobs/new?requisitionId=${requisitionId}`} className="btn-primary">
              <Briefcase className="w-4 h-4" /> Create Job Opening
            </Link>
          )}
          {requisition.linkedJobId && (
            <Link href={`/hr/recruitment/jobs/${requisition.linkedJobId}`} className="btn-secondary">
              <Briefcase className="w-4 h-4" /> View Job Opening
            </Link>
          )}
        </div>
      </div>

      {requisition.status === 'REJECTED' && requisition.rejectionReason && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <strong>Rejected:</strong> {requisition.rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Position Information">
          <Row label="Department" value={requisition.department?.name} />
          <Row label="Designation" value={requisition.designation?.name} />
          <Row label="Openings" value={requisition.openings} />
          <Row label="Employment Type" value={EMPLOYMENT_TYPE_LABELS[requisition.employmentType]} />
          <Row label="Work Mode" value={WORK_MODE_LABELS[requisition.workMode]} />
          <Row label="Location" value={requisition.location?.name} />
          <Row label="Hiring Manager" value={personName(requisition.hiringManager)} />
          <Row label="Recruiter" value={requisition.recruiter ? personName(requisition.recruiter) : 'Not assigned yet'} />
          <Row label="Requested By" value={personName(requisition.requestedBy)} />
        </SectionCard>

        <SectionCard title="Hiring Requirement">
          <Row label="Hiring Reason" value={HIRING_REASON_LABELS[requisition.hiringReason]} />
          {requisition.hiringReason === 'REPLACEMENT' && (
            <>
              <Row label="Employee Being Replaced" value={personName(requisition.replacementEmployee)} />
              <Row label="Last Working Date" value={requisition.lastWorkingDate ? formatDate(requisition.lastWorkingDate) : '—'} />
              <Row label="Replacement Reason" value={requisition.replacementReason} />
            </>
          )}
          {requisition.hiringReason === 'OTHER' && <Row label="Reason Details" value={requisition.otherReasonDetails} />}
        </SectionCard>

        <SectionCard title="Skills & Experience">
          <Row label="Experience Range" value={requisition.minExperience != null ? `${requisition.minExperience}–${requisition.maxExperience ?? '?'} years` : '—'} />
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Required Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {(requisition.requiredSkills || []).length === 0 && <span className="text-sm text-slate-400">—</span>}
              {(requisition.requiredSkills || []).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">{s}</span>
              ))}
            </div>
          </div>
          {(requisition.preferredSkills || []).length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-1.5 mt-2">Preferred Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {requisition.preferredSkills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
          <Row label="Education" value={requisition.education} />
          <Row label="Certification" value={requisition.certifications} />
          <Row label="Industry Experience" value={requisition.industryExperience} />
        </SectionCard>

        {canSeeBudget && (
          <SectionCard title="Budget">
            <Row label="CTC Range" value={requisition.minCtc != null ? `${requisition.currency} ${requisition.minCtc.toLocaleString('en-IN')} – ${requisition.maxCtc?.toLocaleString('en-IN') ?? '?'}` : '—'} />
            <Row label="Budget Type" value={BUDGET_TYPE_LABELS[requisition.budgetType]} />
            <Row label="Budget Approved" value={requisition.budgetApproved ? 'Yes' : 'No'} />
          </SectionCard>
        )}

        <SectionCard title="Timeline">
          <Row label="Expected Joining Date" value={requisition.expectedJoiningDate ? formatDate(requisition.expectedJoiningDate) : '—'} />
          <Row label="Application Target Date" value={requisition.applicationTargetDate ? formatDate(requisition.applicationTargetDate) : '—'} />
          <Row label="Priority" value={PRIORITY_LABELS[requisition.priority]} />
        </SectionCard>

        <SectionCard title="Job Description">
          <div className="space-y-3 text-sm">
            <div><p className="text-xs text-slate-400 mb-1">Job Summary</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{requisition.jobSummary || '—'}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">Responsibilities</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{requisition.responsibilities || '—'}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">Required Qualifications</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{requisition.requiredQualifications || '—'}</p></div>
            {requisition.preferredQualifications && <div><p className="text-xs text-slate-400 mb-1">Preferred Qualifications</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{requisition.preferredQualifications}</p></div>}
            {requisition.benefits && <div><p className="text-xs text-slate-400 mb-1">Benefits</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{requisition.benefits}</p></div>}
            {requisition.additionalNotes && <div><p className="text-xs text-slate-400 mb-1">Additional Notes</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{requisition.additionalNotes}</p></div>}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Approval History">
          {(requisition.activityLog || []).filter((a) => ['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(a.type)).length === 0 ? (
            <p className="text-sm text-slate-400">Not yet submitted for approval.</p>
          ) : (
            <div className="space-y-3">
              {requisition.activityLog.filter((a) => ['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(a.type)).map((entry, i) => (
                <div key={i} className="text-sm border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                  <p className="font-medium text-slate-700 dark:text-slate-200">{entry.message}</p>
                  {entry.comment && <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">&ldquo;{entry.comment}&rdquo;</p>}
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(entry.createdAt, 'dd MMM yyyy')} · {formatDate(entry.createdAt, 'hh:mm a')}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Activity Timeline">
          <div className="space-y-3">
            {(requisition.activityLog || []).map((entry, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-700 dark:text-slate-200">
                    <span className="font-medium">{ACTIVITY_LABEL[entry.type] || entry.type}</span>
                    {entry.actorName && <span className="text-slate-400"> by {entry.actorName}</span>}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(entry.createdAt, 'dd MMM')} · {formatRelativeTime(entry.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {dialogType === 'submit' && (
        <ConfirmDialog
          open
          title="Submit for approval?"
          description={`${requisition.requisitionCode} will be sent for approval and can no longer be freely edited.`}
          requireReason={false}
          confirmLabel="Submit"
          variant="default"
          loading={busy}
          onConfirm={() => runAction('submit')}
          onClose={() => setDialogType(null)}
        />
      )}
      {dialogType === 'approve' && (
        <ConfirmDialog
          open
          title="Approve this requisition?"
          description={`${requisition.requisitionCode} — ${requisition.jobTitle}`}
          requireReason={false}
          confirmLabel="Approve"
          variant="default"
          loading={busy}
          onConfirm={() => runAction('approve', approveComment.trim())}
          onClose={() => { setDialogType(null); setApproveComment('') }}
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Approval comment (optional)</span>
            <textarea className="input-field min-h-20 resize-none" value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="Any notes for the record..." />
          </label>
        </ConfirmDialog>
      )}
      {dialogType === 'reject' && (
        <ConfirmDialog
          open
          title="Reject this requisition?"
          description={`${requisition.requisitionCode} — ${requisition.jobTitle}`}
          requireReason
          confirmLabel="Reject"
          variant="danger"
          loading={busy}
          onConfirm={(reason) => runAction('reject', reason)}
          onClose={() => setDialogType(null)}
        />
      )}
      {dialogType === 'cancel' && (
        <ConfirmDialog
          open
          title="Cancel this requisition?"
          description={`${requisition.requisitionCode} — ${requisition.jobTitle}`}
          requireReason={false}
          confirmLabel="Cancel Requisition"
          variant="danger"
          loading={busy}
          onConfirm={() => runAction('cancel')}
          onClose={() => setDialogType(null)}
        />
      )}
    </div>
  )
}
