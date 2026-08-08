'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Pencil, Rocket, PauseCircle, RotateCcw, XCircle, Copy, ArrowLeft, Clock, FileStack,
  Users, ThumbsUp, CalendarCheck, FileSignature, UserCheck2,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PublishingTab } from './PublishingTab'
import { jobApi } from '@/services/jobApi'
import { publishingApi } from '@/services/publishingApi'
import { candidateApi } from '@/services/candidateApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import {
  JOB_STATUS_LABELS, JOB_EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS,
  APPLICATION_FIELD_LABELS, JOB_VISIBILITY_LABELS, SCREENING_QUESTION_TYPE_LABELS,
  getAvailableJobActions,
} from '@/lib/jobConstants'
import { ACTIVE_PUBLICATION_STATUSES } from '@/lib/publishingConstants'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'activity', label: 'Activity' },
  { key: 'publishing', label: 'Publishing' },
]
const BUILT_TABS = ['overview', 'activity', 'publishing']

// Close/Cancel need to know first whether anything is actively published,
// so the confirm dialog can offer to unpublish everything in one step
// rather than silently leaving stale listings live — see the custom
// 3-button dialog below (plain ConfirmDialog only supports one action).
function CloseWithPublicationsDialog({ actionLabel, activeCount, loading, onCloseAndUnpublish, onCloseOnly, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{actionLabel} this job opening?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          This job is currently published on {activeCount} channel{activeCount === 1 ? '' : 's'}. Unpublish from all active channels?
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onCloseAndUnpublish} disabled={loading} className="btn-danger justify-center">{actionLabel} + Unpublish</button>
          <button type="button" onClick={onCloseOnly} disabled={loading} className="btn-secondary justify-center">{actionLabel} Only (keep listings live)</button>
          <button type="button" onClick={onCancel} disabled={loading} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1.5">Cancel</button>
        </div>
      </div>
    </div>
  )
}

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
function MetricTile({ icon: Icon, label, value }) {
  return (
    <div className="stat-card !p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  )
}

export function JobDetailPage({ jobId }) {
  const user = useAuthStore((s) => s.user)
  const addNotification = useUIStore((s) => s.addNotification)
  const session = useMemo(() => (user ? { role: user.role, userId: user.id, permissions: user.permissions || [] } : null), [user])

  const [job, setJob] = useState(null)
  const [applicationCount, setApplicationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('overview')
  const [dialogType, setDialogType] = useState(null)
  const [closeCancelPrompt, setCloseCancelPrompt] = useState(null) // { type, activeCount }
  const [checkingPublications, setCheckingPublications] = useState(false)

  function load() {
    setLoading(true)
    jobApi.get(jobId)
      .then((res) => setJob(res.data.data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
    // Applications is the only metric with real data behind it yet (Step 5)
    // — Shortlisted/Interviews/Offers/Hired stay 0 until later steps build
    // pipeline movement, interviews and offers.
    candidateApi.list({ job: jobId, size: 1 })
      .then((res) => setApplicationCount(res.data.data.totalElements || 0))
      .catch(() => {})
  }
  useEffect(load, [jobId])

  if (loading) return <PageLoader />
  if (notFound || !job) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Job opening not found</h3>
        <Link href="/hr/recruitment/jobs" className="btn-secondary mx-auto w-fit">Back to Open Positions</Link>
      </div>
    )
  }

  const actions = session ? getAvailableJobActions(job, session) : ['view']
  const personName = (p) => (p ? `${p.firstName} ${p.lastName}` : '—')

  async function runAction(type, extra, unpublishAll) {
    setBusy(true)
    try {
      if (type === 'open') { await jobApi.open(jobId); addNotification({ title: 'Job opening published', message: `${job.jobCode} is now live`, type: 'success' }) }
      else if (type === 'pause') { await jobApi.pause(jobId, extra); addNotification({ title: 'Job paused', message: `${job.jobCode} was paused`, type: 'info' }) }
      else if (type === 'reopen') { await jobApi.reopen(jobId); addNotification({ title: 'Job reopened', message: `${job.jobCode} is open again`, type: 'success' }) }
      else if (type === 'close') {
        await jobApi.close(jobId, extra, unpublishAll)
        addNotification({ title: 'Job closed', message: unpublishAll ? `${job.jobCode} was closed and unpublished everywhere` : `${job.jobCode} was closed`, type: 'info' })
      }
      else if (type === 'cancel') {
        await jobApi.cancel(jobId, extra, unpublishAll)
        addNotification({ title: 'Job cancelled', message: unpublishAll ? `${job.jobCode} was cancelled and unpublished everywhere` : `${job.jobCode} was cancelled`, type: 'warning' })
      }
      else if (type === 'duplicate') {
        const res = await jobApi.duplicate(jobId)
        addNotification({ title: 'Job duplicated', message: `Draft copy ${res.data.data.jobCode} created`, type: 'info' })
        setDialogType(null); setBusy(false)
        window.location.href = `/hr/recruitment/jobs/${res.data.data._id}/edit`
        return
      }
      setDialogType(null)
      setCloseCancelPrompt(null)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  // Close/Cancel first check whether anything is actively published — if
  // so, offer the combined "+ Unpublish" action instead of silently
  // leaving stale listings live (spec: "prevents stale jobs from remaining
  // publicly visible"). Nothing here changes publications on its own; HR
  // still has to choose.
  async function handleCloseOrCancelClick(type) {
    setCheckingPublications(true)
    try {
      const res = await publishingApi.listPublications(jobId)
      const activeCount = (res.data.data || []).filter((p) => ACTIVE_PUBLICATION_STATUSES.includes(p.status)).length
      if (activeCount > 0) {
        setCloseCancelPrompt({ type, activeCount })
      } else {
        setDialogType(type)
      }
    } catch {
      setDialogType(type) // fall back to the plain confirm if the check itself fails
    } finally {
      setCheckingPublications(false)
    }
  }

  const remaining = job.remainingOpenings ?? Math.max(0, (job.totalOpenings || 0) - (job.filledOpenings || 0))

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href="/hr/recruitment/jobs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Open Positions
      </Link>

      <div className="page-header">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{job.jobCode}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{job.jobTitle}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{JOB_STATUS_LABELS[job.status] || job.status}</Badge>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{job.totalOpenings} Position{job.totalOpenings === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.includes('edit') && <Link href={`/hr/recruitment/jobs/${jobId}/edit`} className="btn-secondary"><Pencil className="w-4 h-4" /> Edit</Link>}
          {actions.includes('open') && <button className="btn-primary" onClick={() => setDialogType('open')}><Rocket className="w-4 h-4" /> Publish</button>}
          {actions.includes('pause') && <button className="btn-secondary" onClick={() => setDialogType('pause')}><PauseCircle className="w-4 h-4" /> Pause</button>}
          {actions.includes('reopen') && <button className="btn-primary" onClick={() => setDialogType('reopen')}><RotateCcw className="w-4 h-4" /> Reopen</button>}
          {actions.includes('close') && <button className="btn-secondary" disabled={checkingPublications} onClick={() => handleCloseOrCancelClick('close')}><XCircle className="w-4 h-4" /> Close</button>}
          {actions.includes('cancel') && <button className="btn-danger" disabled={checkingPublications} onClick={() => handleCloseOrCancelClick('cancel')}><XCircle className="w-4 h-4" /> Cancel</button>}
          {actions.includes('duplicate') && <button className="btn-secondary" onClick={() => setDialogType('duplicate')}><Copy className="w-4 h-4" /> Duplicate</button>}
        </div>
      </div>

      {/* Top metrics — will start reflecting real numbers once Candidates (Step 5+) exists */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MetricTile icon={Users} label="Applications" value={applicationCount} />
        <MetricTile icon={ThumbsUp} label="Shortlisted" value={0} />
        <MetricTile icon={CalendarCheck} label="Interviews" value={0} />
        <MetricTile icon={FileSignature} label="Offers" value={0} />
        <MetricTile icon={UserCheck2} label="Hired" value={0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            {t.label}
            {!BUILT_TABS.includes(t.key) && <span className="ml-1.5 text-[10px] text-slate-300 dark:text-slate-600">soon</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="stat-card">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Vacancy Tracking</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{job.totalOpenings}</p><p className="text-xs text-slate-400 mt-1">Total Openings</p></div>
              <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{job.filledOpenings || 0}</p><p className="text-xs text-slate-400 mt-1">Joined</p></div>
              <div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{remaining}</p><p className="text-xs text-slate-400 mt-1">Remaining</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Position Details">
              <Row label="Department" value={job.department?.name} />
              <Row label="Designation" value={job.designation?.name} />
              <Row label="Employment Type" value={JOB_EMPLOYMENT_TYPE_LABELS[job.employmentType]} />
              <Row label="Work Mode" value={WORK_MODE_LABELS[job.workMode]} />
              <Row label="Location" value={job.location?.name} />
              <Row label="Hiring Manager" value={personName(job.hiringManager)} />
              <Row label="Recruiter" value={personName(job.recruiter)} />
              <Row label="Visibility" value={JOB_VISIBILITY_LABELS[job.visibility]} />
            </SectionCard>

            <SectionCard title="Experience & Skills">
              <Row label="Experience Range" value={job.minExperience != null ? `${job.minExperience}–${job.maxExperience ?? '?'} years` : '—'} />
              <Row label="Freshers Allowed" value={job.freshersAllowed ? 'Yes' : 'No'} />
              <Row label="Minimum Education" value={job.minEducation} />
              <Row label="Preferred Education" value={job.preferredEducation} />
              <Row label="Certifications" value={job.certifications} />
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(job.requiredSkills || []).length === 0 && <span className="text-sm text-slate-400">—</span>}
                  {(job.requiredSkills || []).map((s) => (
                    <span key={s.skillName} className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {s.skillName}{s.minYears ? ` · ${s.minYears}y` : ''}{s.proficiency ? ` · ${s.proficiency}` : ''}
                    </span>
                  ))}
                </div>
              </div>
              {(job.preferredSkills || []).length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1.5 mt-2">Preferred Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.preferredSkills.map((s) => (
                      <span key={s.skillName} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">{s.skillName}</span>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Compensation">
              <Row label="Internal Budget" value={job.internalMinCtc != null ? `${job.currency} ${job.internalMinCtc.toLocaleString('en-IN')} – ${job.internalMaxCtc?.toLocaleString('en-IN') ?? '?'}` : '—'} />
              <Row label="Public Salary Range" value={job.publicSalaryVisible ? `${job.currency} ${job.publicMinCtc?.toLocaleString('en-IN') ?? '?'} – ${job.publicMaxCtc?.toLocaleString('en-IN') ?? '?'}` : 'Not Disclosed'} />
            </SectionCard>

            <SectionCard title="Dates">
              <Row label="Opening Date" value={job.openingDate ? formatDate(job.openingDate) : '—'} />
              <Row label="Application Deadline" value={job.applicationDeadline ? formatDate(job.applicationDeadline) : '—'} />
              <Row label="Expected Joining Date" value={job.expectedJoiningDate ? formatDate(job.expectedJoiningDate) : '—'} />
              <Row label="Target Closing Date" value={job.targetClosingDate ? formatDate(job.targetClosingDate) : '—'} />
            </SectionCard>

            <SectionCard title="Job Description" >
              <div className="space-y-3 text-sm">
                <div><p className="text-xs text-slate-400 mb-1">Job Summary</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{job.jobSummary || '—'}</p></div>
                <div><p className="text-xs text-slate-400 mb-1">Responsibilities</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{job.responsibilities || '—'}</p></div>
                <div><p className="text-xs text-slate-400 mb-1">Required Qualifications</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{job.requiredQualifications || '—'}</p></div>
                {job.preferredQualifications && <div><p className="text-xs text-slate-400 mb-1">Preferred Qualifications</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{job.preferredQualifications}</p></div>}
                {job.aboutRole && <div><p className="text-xs text-slate-400 mb-1">About the Role</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{job.aboutRole}</p></div>}
                {job.benefits && <div><p className="text-xs text-slate-400 mb-1">Benefits</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{job.benefits}</p></div>}
                {job.perks && <div><p className="text-xs text-slate-400 mb-1">Perks</p><p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{job.perks}</p></div>}
              </div>
            </SectionCard>

            <SectionCard title="Linked Requisition">
              {job.requisitionId ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{job.requisitionId.requisitionCode}</p>
                    <p className="text-xs text-slate-400">{job.requisitionId.jobTitle}</p>
                  </div>
                  <Link href={`/hr/recruitment/requisitions/${job.requisitionId._id}`} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">View Requisition</Link>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Created directly, without a linked requisition.</p>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Screening Questions">
            {(job.screeningQuestions || []).length === 0 ? (
              <p className="text-sm text-slate-400">No screening questions configured.</p>
            ) : (
              <div className="space-y-2">
                {job.screeningQuestions.map((q, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-slate-700 dark:text-slate-200">{q.question}</p>
                      <p className="text-xs text-slate-400">{SCREENING_QUESTION_TYPE_LABELS[q.type]}{q.isKnockout ? ' · Knockout' : ''}{q.rule ? ` · Min: ${q.rule}` : ''}</p>
                    </div>
                    {q.isRequired && <Badge variant="pending">Required</Badge>}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Application Requirements">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              {(job.applicationFields || []).map((f) => (
                <div key={f.fieldName} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{APPLICATION_FIELD_LABELS[f.fieldName]}</span>
                  <span className={cn('text-xs font-medium', f.requirement === 'REQUIRED' ? 'text-blue-600 dark:text-blue-400' : f.requirement === 'HIDDEN' ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400')}>
                    {f.requirement.charAt(0) + f.requirement.slice(1).toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Hiring Pipeline">
            <div className="flex flex-wrap items-center gap-2">
              {(job.pipelineStages || []).map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">{s.name}</span>
                  {i < job.pipelineStages.length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'activity' && (
        <SectionCard title="Activity Timeline">
          <div className="space-y-3">
            {(job.activityLog || []).map((entry, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-700 dark:text-slate-200">{entry.message}</p>
                  <p className="text-xs text-slate-400">{formatDate(entry.createdAt, 'dd MMM')} · {formatRelativeTime(entry.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {tab === 'publishing' && <PublishingTab job={job} onJobReloaded={load} />}

      {tab !== 'overview' && tab !== 'activity' && tab !== 'publishing' && (
        <div className="stat-card text-center py-16">
          <FileStack className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{TABS.find((t) => t.key === tab)?.label} — Coming Soon</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">This tab is on the roadmap for a later step.</p>
        </div>
      )}

      {dialogType === 'open' && (
        <ConfirmDialog open title="Publish this job opening?" description={`${job.jobCode} will become visible internally as OPEN.`} requireReason={false} confirmLabel="Publish" variant="default" loading={busy} onConfirm={() => runAction('open')} onClose={() => setDialogType(null)} />
      )}
      {dialogType === 'pause' && (
        <ConfirmDialog open title="Pause this job opening?" description={`${job.jobCode} — ${job.jobTitle}`} requireReason={false} confirmLabel="Pause" variant="default" loading={busy} onConfirm={() => runAction('pause')} onClose={() => setDialogType(null)} />
      )}
      {dialogType === 'reopen' && (
        <ConfirmDialog open title="Reopen this job opening?" description={`${job.jobCode} — ${job.jobTitle}`} requireReason={false} confirmLabel="Reopen" variant="default" loading={busy} onConfirm={() => runAction('reopen')} onClose={() => setDialogType(null)} />
      )}
      {dialogType === 'close' && (
        <ConfirmDialog open title="Close this job opening?" description="Hiring stops manually — different from Cancel." requireReason={false} confirmLabel="Close" variant="danger" loading={busy} onConfirm={() => runAction('close')} onClose={() => setDialogType(null)} />
      )}
      {dialogType === 'cancel' && (
        <ConfirmDialog open title="Cancel this job opening?" description="Use this when the requirement no longer exists." requireReason={false} confirmLabel="Cancel Job" variant="danger" loading={busy} onConfirm={() => runAction('cancel')} onClose={() => setDialogType(null)} />
      )}
      {dialogType === 'duplicate' && (
        <ConfirmDialog open title="Duplicate this job opening?" description="Creates a new draft copy with the same skills, screening questions and pipeline." requireReason={false} confirmLabel="Duplicate" variant="default" loading={busy} onConfirm={() => runAction('duplicate')} onClose={() => setDialogType(null)} />
      )}

      {closeCancelPrompt && (
        <CloseWithPublicationsDialog
          actionLabel={closeCancelPrompt.type === 'close' ? 'Close' : 'Cancel'}
          activeCount={closeCancelPrompt.activeCount}
          loading={busy}
          onCloseAndUnpublish={() => runAction(closeCancelPrompt.type, undefined, true)}
          onCloseOnly={() => runAction(closeCancelPrompt.type, undefined, false)}
          onCancel={() => setCloseCancelPrompt(null)}
        />
      )}
    </div>
  )
}
