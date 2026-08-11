'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X, CheckCircle2, AlertTriangle, Search } from 'lucide-react'
import { interviewApi } from '@/services/interviewApi'
import { candidateApi } from '@/services/candidateApi'
import { jobApi } from '@/services/jobApi'
import { cn } from '@/lib/utils'
import {
  INTERVIEW_TYPE_LIST, INTERVIEW_TYPE_LABELS, INTERVIEW_MODE_LIST, INTERVIEW_MODE_LABELS,
  MEETING_PROVIDER_LIST, MEETING_PROVIDER_LABELS,
} from '@/lib/interviewConstants'

function addMinutes(time, minutes) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + Number(minutes || 0)
  const nh = Math.floor((total % 1440) / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function ScheduleInterviewDialog({
  applicationId: presetApplicationId, candidateName: presetCandidateName, jobTitle: presetJobTitle,
  onClose, onScheduled,
}) {
  const [applicationId, setApplicationId] = useState(presetApplicationId || '')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [candidateResults, setCandidateResults] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(presetApplicationId ? { candidateName: presetCandidateName, jobTitle: presetJobTitle } : null)

  const [employees, setEmployees] = useState([])
  const [scorecardTemplates, setScorecardTemplates] = useState([])

  const [roundName, setRoundName] = useState('')
  const [type, setType] = useState('TECHNICAL')
  const [interviewerIds, setInterviewerIds] = useState([])
  const [primaryId, setPrimaryId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [mode, setMode] = useState('ONLINE')
  const [meetingProvider, setMeetingProvider] = useState('GOOGLE_MEET')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [location, setLocation] = useState('')
  const [candidateInstructions, setCandidateInstructions] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [scorecardTemplateId, setScorecardTemplateId] = useState('')

  const [availability, setAvailability] = useState({})
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const endTime = useMemo(() => addMinutes(startTime, duration), [startTime, duration])

  useEffect(() => {
    jobApi.getEmployees().then((res) => setEmployees(res.data.data || []))
    interviewApi.listScorecardTemplates().then((res) => setScorecardTemplates(res.data.data || []))
  }, [])

  useEffect(() => {
    if (!candidateSearch.trim() || presetApplicationId) { setCandidateResults([]); return }
    const t = setTimeout(() => {
      candidateApi.list({ search: candidateSearch, status: 'ACTIVE', size: 8 }).then((res) => setCandidateResults(res.data.data.content || []))
    }, 300)
    return () => clearTimeout(t)
  }, [candidateSearch, presetApplicationId])

  useEffect(() => {
    if (!interviewerIds.length || !date || !startTime || !endTime) { setAvailability({}); return }
    setCheckingAvailability(true)
    interviewApi.availability({ employeeIds: interviewerIds.join(','), date, startTime, endTime })
      .then((res) => setAvailability(res.data.data))
      .finally(() => setCheckingAvailability(false))
  }, [interviewerIds, date, startTime, endTime])

  function toggleInterviewer(id) {
    setInterviewerIds((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
      if (!next.includes(primaryId)) setPrimaryId(next[0] || '')
      return next
    })
  }
  function selectCandidate(row) {
    setApplicationId(row.applicationId)
    setSelectedCandidate({ candidateName: row.candidateName, jobTitle: row.jobTitle })
    setCandidateResults([])
    setCandidateSearch('')
  }

  const conflictCount = Object.values(availability).filter((a) => !a.available).length

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!applicationId) return setError('Please select a candidate')
    if (!interviewerIds.length) return setError('Please select at least one interviewer')
    setSaving(true)
    try {
      await interviewApi.create({
        applicationId, roundName, type, date, startTime, endTime, timezone, mode,
        meetingProvider: mode === 'ONLINE' ? meetingProvider : undefined, meetingUrl: mode === 'ONLINE' ? meetingUrl : undefined,
        location: mode === 'IN_PERSON' ? location : undefined,
        candidateInstructions: candidateInstructions || undefined, internalNotes: internalNotes || undefined,
        scorecardTemplateId: scorecardTemplateId || undefined,
        interviewers: interviewerIds.map((id) => ({ employeeId: id, role: id === primaryId ? 'PRIMARY' : 'PANELIST' })),
      })
      onScheduled?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not schedule interview')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Schedule Interview</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Candidate *</span>
            {presetApplicationId ? (
              <div className="input-field !bg-slate-50 dark:!bg-slate-800/60">{selectedCandidate?.candidateName} — {selectedCandidate?.jobTitle}</div>
            ) : selectedCandidate ? (
              <div className="flex items-center justify-between input-field">
                <span>{selectedCandidate.candidateName} — {selectedCandidate.jobTitle}</span>
                <button type="button" onClick={() => { setSelectedCandidate(null); setApplicationId('') }} className="text-xs text-blue-600 dark:text-blue-400">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input className="input-field pl-9" placeholder="Search candidate name/email..." value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} />
                {candidateResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {candidateResults.map((r) => (
                      <button type="button" key={r.applicationId} onClick={() => selectCandidate(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                        {r.candidateName} <span className="text-slate-400">— {r.jobTitle}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Interview Round *</span>
              <input required className="input-field" placeholder="e.g. Technical Round 1" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Interview Type *</span>
              <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                {INTERVIEW_TYPE_LIST.map((t) => <option key={t} value={t}>{INTERVIEW_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Interviewers * — check availability below</span>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-xl p-2">
              {employees.map((e) => {
                const checked = interviewerIds.includes(e._id)
                const av = availability[e._id]
                return (
                  <label key={e._id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={() => toggleInterviewer(e._id)} className="accent-blue-600" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{e.name}</span>
                      {checked && (
                        <button type="button" onClick={(ev) => { ev.preventDefault(); setPrimaryId(e._id) }} className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', primaryId === e._id ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>
                          {primaryId === e._id ? 'Primary' : 'Set Primary'}
                        </button>
                      )}
                    </span>
                    {checked && av && (
                      av.available
                        ? <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Available</span>
                        : <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Conflict: {av.conflicts[0]?.startTime}–{av.conflicts[0]?.endTime}</span>
                    )}
                  </label>
                )
              })}
            </div>
            {conflictCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {conflictCount} interviewer{conflictCount > 1 ? 's' : ''} have scheduling conflicts.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Date *</span>
              <input required type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Start Time *</span>
              <input required type="time" className="input-field" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Duration (min) *</span>
              <input required type="number" min={15} step={15} className="input-field" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Timezone</span>
              <input className="input-field" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Mode *</span>
              <select className="input-field" value={mode} onChange={(e) => setMode(e.target.value)}>
                {INTERVIEW_MODE_LIST.map((m) => <option key={m} value={m}>{INTERVIEW_MODE_LABELS[m]}</option>)}
              </select>
            </label>
          </div>

          {mode === 'ONLINE' && (
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Meeting Provider</span>
                <select className="input-field" value={meetingProvider} onChange={(e) => setMeetingProvider(e.target.value)}>
                  {MEETING_PROVIDER_LIST.map((p) => <option key={p} value={p}>{MEETING_PROVIDER_LABELS[p]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Meeting Link</span>
                <input className="input-field" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
              </label>
            </div>
          )}
          {mode === 'IN_PERSON' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Office Location</span>
              <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Scorecard Template</span>
            <select className="input-field" value={scorecardTemplateId} onChange={(e) => setScorecardTemplateId(e.target.value)}>
              <option value="">None — free-form feedback only</option>
              {scorecardTemplates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Candidate Instructions</span>
            <textarea className="input-field min-h-16" value={candidateInstructions} onChange={(e) => setCandidateInstructions(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Internal Notes (never shown to the candidate)</span>
            <textarea className="input-field min-h-16" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || checkingAvailability} className="btn-primary">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Schedule Interview
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
