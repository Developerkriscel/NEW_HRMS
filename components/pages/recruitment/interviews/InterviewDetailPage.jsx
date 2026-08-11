'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Video, Phone, MapPin, ExternalLink, RefreshCw, XCircle, CheckCircle2, UserX, Sparkles, ClipboardList,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { interviewApi } from '@/services/interviewApi'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import {
  INTERVIEW_STATUS_LABELS, INTERVIEW_MODE_LABELS, INTERVIEW_TYPE_LABELS, CANCELLATION_REASON_LIST,
  INTERVIEW_RECOMMENDATION_LABELS, FEEDBACK_SLA_HOURS,
} from '@/lib/interviewConstants'
import { ReasonDialog } from '../candidates/ScreeningActions'
import { MoveStageDialog } from '../candidates/MoveStageDialog'
import { SubmitFeedbackForm } from './SubmitFeedbackForm'

const TABS = ['Overview', 'Candidate', 'Panel', 'Scorecards', 'Feedback', 'History']
const MODE_ICON = { ONLINE: Video, PHONE: Phone, IN_PERSON: MapPin }

function SectionCard({ title, children }) {
  return (
    <div className="stat-card space-y-3">
      {title && <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>}
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

function RescheduleDialog({ interview, onClose, onDone }) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!date || !startTime || !endTime || !reason.trim()) return setError('Date, time and reason are required')
    setSaving(true)
    try { await interviewApi.reschedule(interview._id, { date, startTime, endTime, reason: reason.trim() }); onDone() }
    catch (err) { setError(err.response?.data?.message || 'Could not reschedule'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Reschedule Interview</h2>
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <div className="space-y-3">
          <label className="block"><span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">New Date *</span><input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Start *</span><input type="time" className="input-field" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">End *</span><input type="time" className="input-field" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
          </div>
          <label className="block"><span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Reason *</span><input className="input-field" placeholder="e.g. Interviewer unavailable" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={confirm} disabled={saving}>Reschedule</button>
        </div>
      </div>
    </div>
  )
}

function NoShowDialog({ interview, onClose, onDone }) {
  const [type, setType] = useState('CANDIDATE')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  async function confirm() {
    setSaving(true)
    try { await interviewApi.noShow(interview._id, { type, comment }); onDone() } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Record No-Show</h2>
        <div className="flex gap-2 mb-3">
          <button className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', type === 'CANDIDATE' ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400')} onClick={() => setType('CANDIDATE')}>Candidate No Show</button>
          <button className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', type === 'INTERVIEWER' ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400')} onClick={() => setType('INTERVIEWER')}>Interviewer No Show</button>
        </div>
        <textarea className="input-field min-h-16" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="flex justify-end gap-3 mt-4">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={confirm} disabled={saving}>Record</button>
        </div>
      </div>
    </div>
  )
}

export function InterviewDetailPage({ interviewId }) {
  const currentUser = useAuthStore((s) => s.user)
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [panelFeedback, setPanelFeedback] = useState(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showNoShow, setShowNoShow] = useState(false)
  const [showMoveStage, setShowMoveStage] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    interviewApi.get(interviewId).then((res) => setInterview(res.data.data)).finally(() => setLoading(false))
  }
  useEffect(load, [interviewId])

  function loadFeedback() {
    interviewApi.getPanelFeedback(interviewId).then((res) => setPanelFeedback(res.data.data))
  }
  useEffect(() => { if (tab === 'Feedback') loadFeedback() }, [tab, interviewId])

  async function markComplete() {
    setError('')
    try { await interviewApi.complete(interviewId); load() } catch (err) { setError(err.response?.data?.message || 'Could not mark complete') }
  }

  if (loading) return <PageLoader />
  if (!interview) return <div className="stat-card text-center py-16"><p className="text-slate-500">Interview not found.</p></div>

  const candidate = interview.candidateId
  const job = interview.jobId
  const ModeIcon = MODE_ICON[interview.mode] || Video
  const isActive = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS'].includes(interview.status)
  const isPanelMember = (interview.panel || []).some((p) => String(p.employeeId) === String(currentUser?.id))
  const feedbackOverdue = interview.status === 'FEEDBACK_PENDING' && interview.completedAt &&
    (Date.now() - new Date(interview.completedAt).getTime()) / 3600000 > FEEDBACK_SLA_HOURS

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href="/hr/recruitment/interviews" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Interviews
      </Link>

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Candidate'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{job?.publicTitle || job?.jobTitle} · {interview.roundName}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-600 dark:text-slate-300">
            <span>{formatDate(interview.date, 'dd MMM yyyy')} · {interview.startTime}</span>
            <span className="flex items-center gap-1"><ModeIcon className="w-3.5 h-3.5" /> {interview.meetingProvider ? INTERVIEW_TYPE_LABELS[interview.type] : INTERVIEW_MODE_LABELS[interview.mode]}</span>
            <Badge variant={interview.status}>{INTERVIEW_STATUS_LABELS[interview.status]}</Badge>
          </div>
          {feedbackOverdue && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">Feedback pending for {candidate?.firstName} — interview completed {formatRelativeTime(interview.completedAt)}.</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {interview.meetingUrl && isActive && <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="btn-secondary"><ExternalLink className="w-4 h-4" /> Join</a>}
          {isActive && <button className="btn-secondary" onClick={() => setShowReschedule(true)}><RefreshCw className="w-4 h-4" /> Reschedule</button>}
          {isActive && <button className="btn-secondary" onClick={() => setShowCancel(true)}><XCircle className="w-4 h-4 text-red-500" /> Cancel</button>}
          {isActive && <button className="btn-secondary" onClick={() => setShowNoShow(true)}><UserX className="w-4 h-4" /> No-Show</button>}
          {isActive && <button className="btn-primary" onClick={markComplete}><CheckCircle2 className="w-4 h-4" /> Mark Complete</button>}
          <button className="btn-secondary" onClick={() => setShowMoveStage(true)}><ClipboardList className="w-4 h-4" /> Move Candidate</button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

      <div className="border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap', tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Overview' && (
        <div className="space-y-4">
          <SectionCard title="Interview Details">
            <Row label="Round" value={interview.roundName} />
            <Row label="Type" value={INTERVIEW_TYPE_LABELS[interview.type]} />
            <Row label="Date & Time" value={`${formatDate(interview.date, 'dd MMM yyyy')} · ${interview.startTime}–${interview.endTime} (${interview.timezone})`} />
            <Row label="Mode" value={INTERVIEW_MODE_LABELS[interview.mode]} />
            {interview.meetingUrl && <Row label="Meeting Link" value={<a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{interview.meetingUrl}</a>} />}
            {interview.location && <Row label="Location" value={interview.location} />}
            {interview.candidateInstructions && <Row label="Candidate Instructions" value={interview.candidateInstructions} />}
            {interview.internalNotes && <Row label="Internal Notes" value={interview.internalNotes} />}
          </SectionCard>

          {interview.aiMatch && (
            <SectionCard title="AI Match Summary">
              <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-blue-500" /><span className="font-semibold">{interview.aiMatch.overallScore}%</span><Badge variant={interview.aiMatch.matchLabel}>{interview.aiMatch.matchLabel?.replace('_', ' ')}</Badge></div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{interview.aiMatch.summary}</p>
            </SectionCard>
          )}

          {interview.assessments?.length > 0 && (
            <SectionCard title="Assessment Results">
              {interview.assessments.map((a) => (
                <div key={a._id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-500 dark:text-slate-400">Assessment</span>
                  <span className="font-medium">{a.percentage}% {a.result && a.result !== 'PENDING' && <Badge variant={a.result} className="ml-2">{a.result}</Badge>}</span>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'Candidate' && (
        <SectionCard title="Candidate">
          <Row label="Name" value={<Link href={`/hr/recruitment/candidates/${candidate?._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{candidate?.firstName} {candidate?.lastName}</Link>} />
          <Row label="Email" value={candidate?.email} />
          <Row label="Phone" value={candidate?.phone} />
          {candidate?.resumeUrl && <Row label="Resume" value={<a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">View Resume</a>} />}
          <Row label="Job" value={<Link href={`/hr/recruitment/jobs/${job?._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{job?.publicTitle || job?.jobTitle}</Link>} />
          <Row label="Application Status" value={interview.application?.status} />
          <Row label="Current Stage" value={interview.application?.currentStageName} />
        </SectionCard>
      )}

      {tab === 'Panel' && (
        <SectionCard title="Interview Panel">
          <div className="space-y-2">
            {(interview.panel || []).map((p) => (
              <div key={p.employeeId} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.employeeName}</p>
                  <p className="text-xs text-slate-400">{p.role === 'PRIMARY' ? 'Primary Interviewer' : 'Panelist'}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={p.attendanceStatus}>{p.attendanceStatus}</Badge>
                  <Badge variant={p.feedbackStatus === 'SUBMITTED' ? 'COMPLETED' : 'PENDING'}>{p.feedbackStatus}</Badge>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {tab === 'Scorecards' && (
        <SectionCard title="Scorecard Template">
          {interview.scorecardTemplate ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{interview.scorecardTemplate.name}</p>
              {interview.scorecardTemplate.criteria.map((c) => (
                <div key={c._id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-500 dark:text-slate-400">{c.name}</span>
                  <span className="text-slate-400">/ {c.maxScore}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No scorecard template selected — interviewers give a free-form rating instead.</p>
          )}
        </SectionCard>
      )}

      {tab === 'Feedback' && (
        <div className="space-y-4">
          {panelFeedback?.blind && (
            <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
              Other interviewers&apos; feedback is hidden until you submit your own — this reduces bias between panelists.
            </div>
          )}

          <SectionCard title="Panel Status">
            <div className="space-y-1.5">
              {(panelFeedback?.panelStatus || []).map((p) => (
                <div key={p.employeeId} className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
                  <Badge variant={p.feedbackStatus === 'SUBMITTED' ? 'COMPLETED' : 'PENDING'}>{p.feedbackStatus}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>

          {isPanelMember && !panelFeedback?.ownFeedback && ['FEEDBACK_PENDING', 'COMPLETED', 'IN_PROGRESS', 'SCHEDULED', 'CONFIRMED'].includes(interview.status) && (
            <SectionCard title="Submit Your Feedback">
              <SubmitFeedbackForm interviewId={interviewId} criteria={interview.scorecardTemplate?.criteria} onSubmitted={() => { load(); loadFeedback() }} />
            </SectionCard>
          )}

          {panelFeedback?.ownFeedback && (
            <SectionCard title="Your Feedback">
              <Row label="Rating" value={`${panelFeedback.ownFeedback.overallRating} / 10`} />
              <Row label="Recommendation" value={INTERVIEW_RECOMMENDATION_LABELS[panelFeedback.ownFeedback.recommendation]} />
            </SectionCard>
          )}

          {!panelFeedback?.blind && panelFeedback?.feedback?.length > 0 && (
            <SectionCard title="Panel Feedback Summary">
              <div className="space-y-2 mb-3">
                {panelFeedback.feedback.map((f) => (
                  <div key={f._id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                    <span className="text-slate-600 dark:text-slate-300">{f.interviewerName}</span>
                    <span className="flex items-center gap-2">
                      <Badge>{INTERVIEW_RECOMMENDATION_LABELS[f.recommendation]}</Badge>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{f.overallRating}</span>
                    </span>
                  </div>
                ))}
              </div>
              {panelFeedback.summary && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-6">
                  <div><p className="text-xs text-slate-400">Average</p><p className="text-lg font-bold text-slate-800 dark:text-slate-100">{panelFeedback.summary.averageRating} / 10</p></div>
                  <div><p className="text-xs text-slate-400">Consensus</p><p className="text-lg font-bold text-slate-800 dark:text-slate-100">{INTERVIEW_RECOMMENDATION_LABELS[panelFeedback.summary.consensus]}</p></div>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">This is advisory only — HR still makes the final call via Move Candidate.</p>
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'History' && (
        <SectionCard title="Schedule History">
          <div className="space-y-3">
            {(interview.history || []).map((h, i) => (
              <div key={i} className="text-sm border-b border-slate-50 dark:border-slate-800/60 last:border-0 pb-3 last:pb-0">
                <p className="font-medium text-slate-700 dark:text-slate-200">{h.action}</p>
                {h.action === 'RESCHEDULED' ? (
                  <p className="text-slate-500 dark:text-slate-400">{formatDate(h.previousDate, 'dd MMM')} {h.previousStartTime} → {formatDate(h.newDate, 'dd MMM')} {h.newStartTime}{h.reason ? ` — ${h.reason}` : ''}</p>
                ) : h.action === 'CANCELLED' ? (
                  <p className="text-slate-500 dark:text-slate-400">{h.reason}</p>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">{h.newDate ? `${formatDate(h.newDate, 'dd MMM')} ${h.newStartTime}` : ''}</p>
                )}
                <p className="text-xs text-slate-400">{h.changedByName} · {formatRelativeTime(h.changedAt)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {showReschedule && <RescheduleDialog interview={interview} onClose={() => setShowReschedule(false)} onDone={() => { setShowReschedule(false); load() }} />}
      {showCancel && (
        <ReasonDialog title="Cancel Interview" reasons={CANCELLATION_REASON_LIST} confirmLabel="Cancel Interview" variant="danger"
          onClose={() => setShowCancel(false)} onDone={async (data) => { await interviewApi.cancel(interviewId, data); setShowCancel(false); load() }} />
      )}
      {showNoShow && <NoShowDialog interview={interview} onClose={() => setShowNoShow(false)} onDone={() => { setShowNoShow(false); load() }} />}
      {showMoveStage && (
        <MoveStageDialog
          row={{ applicationId: interview.applicationId, jobId: job?._id, candidateName: `${candidate?.firstName} ${candidate?.lastName}`, jobTitle: job?.publicTitle || job?.jobTitle }}
          onClose={() => setShowMoveStage(false)} onMoved={() => setShowMoveStage(false)}
        />
      )}
    </div>
  )
}
