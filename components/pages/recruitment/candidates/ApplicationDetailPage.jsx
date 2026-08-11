'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Clock, Plus, ArrowRightLeft } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { candidateApi } from '@/services/candidateApi'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { APPLICATION_SOURCE_LABELS } from '@/lib/candidateConstants'
import { SELECTION_STATUS_LABELS } from '@/lib/selectionConstants'
import { MoveStageDialog } from './MoveStageDialog'
import { MatchScoreCard } from './MatchScoreCard'
import { ScreeningActions } from './ScreeningActions'
import { AssessmentsSection } from '../assessments/AssessmentsSection'
import { InterviewsSection } from '../interviews/InterviewsSection'

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

export function ApplicationDetailPage({ applicationId }) {
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showMoveStage, setShowMoveStage] = useState(false)

  function load() {
    setLoading(true)
    candidateApi.getApplication(applicationId)
      .then((res) => setApplication(res.data.data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [applicationId])

  async function addNote() {
    if (!noteDraft.trim()) return
    setSavingNote(true)
    try {
      await candidateApi.addApplicationNote(applicationId, noteDraft.trim())
      setNoteDraft('')
      load()
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) return <PageLoader />
  if (notFound || !application) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Application not found</h3>
        <Link href="/hr/recruitment/candidates" className="btn-secondary mx-auto w-fit">Back to Candidates</Link>
      </div>
    )
  }

  const candidate = application.candidateId
  const job = application.jobId
  const notes = (application.activityLog || []).filter((a) => a.type === 'NOTE')
  const otherActivity = (application.activityLog || []).filter((a) => a.type !== 'NOTE')

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href="/hr/recruitment/candidates" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Candidates
      </Link>

      <div className="page-header">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{application.applicationCode}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{candidate?.firstName} {candidate?.lastName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Applied for {job?.publicTitle || job?.jobTitle}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge>{application.currentStageName}</Badge>
            <Badge variant={application.status}>{application.status.replace('_', ' ')}</Badge>
            {application.screeningResult === 'NEEDS_REVIEW' && <Badge variant="pending">Needs Review</Badge>}
            {application.selectionStatus && <Badge variant={application.selectionStatus}>{SELECTION_STATUS_LABELS[application.selectionStatus] || application.selectionStatus}</Badge>}
            {application.readyForOffer && <Badge variant="READY_FOR_OFFER">Ready for Offer</Badge>}
          </div>
          {application.status === 'REJECTED' && application.rejectionReason && (
            <p className="text-xs text-red-500 mt-1.5">Rejected — {application.rejectionReason}{application.rejectionComment ? `: ${application.rejectionComment}` : ''}</p>
          )}
          {application.status === 'WITHDRAWN' && application.withdrawalReason && (
            <p className="text-xs text-slate-400 mt-1.5">Withdrawn — {application.withdrawalReason}{application.withdrawalComment ? `: ${application.withdrawalComment}` : ''}</p>
          )}
          {application.status === 'ON_HOLD' && application.holdReason && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">On Hold — {application.holdReason}{application.holdUntil ? ` (until ${formatDate(application.holdUntil)})` : ''}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/hr/recruitment/candidates/${candidate?._id}`} className="btn-secondary">View Candidate Profile</Link>
          {application.selectionStatus && (
            <Link href={`/hr/recruitment/applications/${applicationId}/selection`} className="btn-secondary">Review Selection</Link>
          )}
          <button className="btn-primary" onClick={() => setShowMoveStage(true)}><ArrowRightLeft className="w-4 h-4" /> Move Stage</button>
        </div>
      </div>

      <SectionCard title="Screening Decision">
        <ScreeningActions application={application} onChanged={load} />
      </SectionCard>

      <MatchScoreCard applicationId={applicationId} />

      <AssessmentsSection applicationId={applicationId} candidateName={`${candidate?.firstName} ${candidate?.lastName}`} />

      <InterviewsSection applicationId={applicationId} candidateName={`${candidate?.firstName} ${candidate?.lastName}`} jobTitle={job?.publicTitle || job?.jobTitle} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Application Details">
          <Row label="Candidate" value={<Link href={`/hr/recruitment/candidates/${candidate?._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{candidate?.firstName} {candidate?.lastName}</Link>} />
          <Row label="Job" value={<Link href={`/hr/recruitment/jobs/${job?._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{job?.publicTitle || job?.jobTitle}</Link>} />
          <Row label="Source" value={APPLICATION_SOURCE_LABELS[application.source] || application.source} />
          {application.referrerEmployeeId && <Row label="Referred By" value={`${application.referrerEmployeeId.firstName} ${application.referrerEmployeeId.lastName}`} />}
          <Row label="Applied Date" value={formatDate(application.appliedAt, 'dd MMM yyyy · hh:mm a')} />
          <Row label="Current Stage" value={application.currentStageName} />
          <Row label="Screening" value={application.screeningResult === 'NEEDS_REVIEW' ? 'Needs Review' : 'Passed'} />
        </SectionCard>

        <SectionCard title="Resume">
          {candidate?.resumeUrl ? (
            <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors w-fit">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">View Resume</span>
            </a>
          ) : (
            <p className="text-sm text-slate-400">No resume on file.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Screening Questions & Answers">
        {(application.answers || []).length === 0 ? (
          <p className="text-sm text-slate-400">This job has no screening questions.</p>
        ) : (
          <div className="space-y-3">
            {application.answers.map((a) => (
              <div key={a._id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-3 last:pb-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.questionText}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{Array.isArray(a.answer) ? a.answer.join(', ') : String(a.answer ?? '—')}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recruiter Notes">
        <div className="flex gap-2 mb-3">
          <input className="input-field" placeholder="Add a recruiter note..." value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }} />
          <button type="button" onClick={addNote} disabled={savingNote} className="btn-secondary !px-3"><Plus className="w-4 h-4" /></button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-400">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div key={i} className="text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-2 last:pb-0">
                <p className="text-slate-700 dark:text-slate-200">{n.message}</p>
                <p className="text-xs text-slate-400">{n.actorName || 'HR'} · {formatRelativeTime(n.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Activity Timeline">
        <div className="space-y-3">
          {otherActivity.map((entry, i) => (
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

      {showMoveStage && (
        <MoveStageDialog
          row={{ applicationId, jobId: job?._id, candidateName: `${candidate?.firstName} ${candidate?.lastName}`, jobTitle: job?.publicTitle || job?.jobTitle }}
          onClose={() => setShowMoveStage(false)}
          onMoved={() => { setShowMoveStage(false); load() }}
        />
      )}
    </div>
  )
}
