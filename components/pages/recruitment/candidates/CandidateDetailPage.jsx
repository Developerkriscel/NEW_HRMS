'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Clock, Plus, X } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { candidateApi } from '@/services/candidateApi'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { CANDIDATE_STATUS_LIST, CANDIDATE_STATUS_LABELS, APPLICATION_SOURCE_LABELS } from '@/lib/candidateConstants'

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

export function CandidateDetailPage({ candidateId }) {
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [skillDraft, setSkillDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  function load() {
    setLoading(true)
    candidateApi.get(candidateId)
      .then((res) => setCandidate(res.data.data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [candidateId])

  async function updateStatus(status) {
    await candidateApi.update(candidateId, { status })
    load()
  }

  async function addSkill() {
    const skill = skillDraft.trim()
    if (!skill) return
    await candidateApi.update(candidateId, { skills: [...(candidate.skills || []), skill] })
    setSkillDraft('')
    load()
  }
  async function removeSkill(skill) {
    await candidateApi.update(candidateId, { skills: (candidate.skills || []).filter((s) => s !== skill) })
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Contact Details">
          <Row label="Email" value={candidate.email} />
          <Row label="Phone" value={candidate.phone} />
          <Row label="Current Location" value={candidate.currentLocation} />
          <Row label="LinkedIn" value={candidate.linkedinUrl ? <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Profile</a> : '—'} />
          <Row label="GitHub" value={candidate.githubUrl ? <a href={candidate.githubUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Profile</a> : '—'} />
          <Row label="Portfolio" value={candidate.portfolioUrl ? <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Link</a> : '—'} />
        </SectionCard>

        <SectionCard title="Experience">
          <Row label="Current Company" value={candidate.currentCompany} />
          <Row label="Current Designation" value={candidate.currentDesignation} />
          <Row label="Total Experience" value={candidate.totalExperience != null ? `${candidate.totalExperience} years` : '—'} />
          <Row label="Relevant Experience" value={candidate.relevantExperience != null ? `${candidate.relevantExperience} years` : '—'} />
          <Row label="Current CTC" value={candidate.currentCtc != null ? candidate.currentCtc.toLocaleString('en-IN') : '—'} />
          <Row label="Expected CTC" value={candidate.expectedCtc != null ? candidate.expectedCtc.toLocaleString('en-IN') : '—'} />
          <Row label="Notice Period" value={candidate.noticePeriod} />
          <Row label="Last Working Date" value={candidate.lastWorkingDate ? formatDate(candidate.lastWorkingDate) : '—'} />
        </SectionCard>

        <SectionCard title="Resume">
          {candidate.resumeUrl ? (
            <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors w-fit">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">View Resume</span>
            </a>
          ) : (
            <p className="text-sm text-slate-400">No resume on file.</p>
          )}
        </SectionCard>

        <SectionCard title="Skills">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(candidate.skills || []).length === 0 && <span className="text-sm text-slate-400">No skills recorded yet.</span>}
            {(candidate.skills || []).map((s) => (
              <span key={s} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                {s}
                <button onClick={() => removeSkill(s)} className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800/50"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-field" placeholder="Add a skill" value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} />
            <button type="button" onClick={addSkill} className="btn-secondary !px-3"><Plus className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-slate-400">Manual for now — resume parsing lands in a later step.</p>
        </SectionCard>
      </div>

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

      <SectionCard title="Activity">
        <div className="space-y-3">
          {(candidate.activityLog || []).map((entry, i) => (
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
    </div>
  )
}
