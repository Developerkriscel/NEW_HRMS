'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Plus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { candidateApi } from '@/services/candidateApi'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { CANDIDATE_STATUS_LIST, CANDIDATE_STATUS_LABELS, APPLICATION_SOURCE_LABELS } from '@/lib/candidateConstants'
import { OverviewTab } from './tabs/OverviewTab'
import { ResumeTab } from './tabs/ResumeTab'
import { ExperienceTab } from './tabs/ExperienceTab'
import { EducationTab } from './tabs/EducationTab'
import { SkillsTab } from './tabs/SkillsTab'
import { DocumentsTab } from './tabs/DocumentsTab'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'resume', label: 'Resume' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'activity', label: 'Activity' },
]

function SectionCard({ title, children }) {
  return (
    <div className="stat-card space-y-3">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {children}
    </div>
  )
}

export function CandidateDetailPage({ candidateId }) {
  const [candidate, setCandidate] = useState(null)
  const [profile, setProfile] = useState({ skills: [], experience: [], education: [], certifications: [], projects: [] })
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState('overview')
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const pollTimeout = useRef(null)

  function load() {
    Promise.all([
      candidateApi.get(candidateId),
      candidateApi.getProfile(candidateId),
      candidateApi.listResumes(candidateId),
    ])
      .then(([candidateRes, profileRes, resumesRes]) => {
        setCandidate(candidateRes.data.data)
        setProfile(profileRes.data.data)
        setResumes(resumesRes.data.data)

        // Parsing runs in the background — poll gently while any resume is
        // still UPLOADED/PARSING so the status badge updates without a
        // manual refresh (parsing is a fast, in-process heuristic pass, so
        // this typically only fires once or twice).
        const stillWorking = (resumesRes.data.data || []).some((r) => ['UPLOADED', 'PARSING'].includes(r.parsingStatus))
        clearTimeout(pollTimeout.current)
        if (stillWorking) pollTimeout.current = setTimeout(load, 1500)
      })
      .catch((err) => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
    return () => clearTimeout(pollTimeout.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId])

  async function updateStatus(status) {
    await candidateApi.update(candidateId, { status })
    load()
  }

  async function addNote() {
    if (!noteDraft.trim()) return
    setSavingNote(true)
    try {
      await candidateApi.addNote(candidateId, noteDraft.trim())
      setNoteDraft('')
      load()
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) return <PageLoader />
  if (notFound || !candidate) {
    return (
      <div className="stat-card text-center py-16">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Candidate not found</h3>
        <Link href="/hr/recruitment/candidates" className="btn-secondary mx-auto w-fit">Back to Candidates</Link>
      </div>
    )
  }

  const notes = (candidate.activityLog || []).filter((a) => a.type === 'NOTE')
  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim()

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <Link href="/hr/recruitment/candidates" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Candidates
      </Link>

      <div className="page-header">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{candidate.candidateCode}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{fullName}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{candidate.status}</Badge>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Source: {APPLICATION_SOURCE_LABELS[candidate.source] || candidate.source}</span>
          </div>
        </div>
        <select className="input-field w-auto" value={candidate.status} onChange={(e) => updateStatus(e.target.value)}>
          {CANDIDATE_STATUS_LIST.map((s) => <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                tab === t.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {tab === 'overview' && <OverviewTab candidate={candidate} skills={profile.skills} resumes={resumes} />}

        {tab === 'applications' && (
          <SectionCard title="Applications">
            {candidate.applications.length === 0 ? (
              <p className="text-sm text-slate-400">No applications yet.</p>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {candidate.applications.map((app) => (
                  <div key={app._id} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link href={`/hr/recruitment/applications/${app._id}`} className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                        {app.jobId?.publicTitle || app.jobId?.jobTitle}
                      </Link>
                      <p className="text-xs text-slate-400">{app.applicationCode} · Applied {formatDate(app.appliedAt)}</p>
                    </div>
                    <Badge>{app.currentStageName}</Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {tab === 'resume' && <ResumeTab candidateId={candidateId} resumes={resumes} onChanged={load} />}
        {tab === 'experience' && <ExperienceTab candidateId={candidateId} experience={profile.experience} projects={profile.projects} onChanged={load} />}
        {tab === 'education' && <EducationTab candidateId={candidateId} education={profile.education} certifications={profile.certifications} onChanged={load} />}
        {tab === 'skills' && <SkillsTab candidateId={candidateId} skills={profile.skills} onChanged={load} />}
        {tab === 'documents' && <DocumentsTab resumes={resumes} />}

        {tab === 'notes' && (
          <SectionCard title="Notes">
            <div className="flex gap-2 mb-3">
              <input className="input-field" placeholder="Add a note about this candidate..." value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }} />
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
        )}

        {tab === 'activity' && (
          <SectionCard title="Activity">
            <div className="space-y-3">
              {(candidate.activityLog || []).slice().reverse().map((entry, i) => (
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
      </div>
    </div>
  )
}
