'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Scale, Tag as TagIcon, UserCog, XCircle, Archive, X, Pencil } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { pipelineApi } from '@/services/pipelineApi'
import { candidateApi } from '@/services/candidateApi'
import { PIPELINE_STAGE_CATEGORY_LABELS, canManageJobs } from '@/lib/jobConstants'
import { REJECTION_REASON_LIST } from '@/lib/matchingConstants'
import { APPLICATION_SOURCE_LABELS, APPLICATION_SOURCE_LIST } from '@/lib/candidateConstants'
import { canManageCompensation } from '@/lib/compensationConstants'
import { useAuthStore } from '@/store/authStore'
import { ReasonDialog } from '../candidates/ScreeningActions'
import { MoveStageDialog } from '../candidates/MoveStageDialog'
import { AddNoteDialog } from '../candidates/AddNoteDialog'
import { ScheduleInterviewDialog } from '../interviews/ScheduleInterviewDialog'
import { AssignAssessmentDialog } from '../assessments/AssignAssessmentDialog'
import { EvaluateAssessmentModal } from '../assessments/EvaluateAssessmentModal'
import { PipelineCard } from './PipelineCard'
import { AssessmentPanel } from './AssessmentPanel'
import { CompensationPanel } from './CompensationPanel'

function StageColumn({ stage, cards, metrics, onDropCard, selected, onToggleSelect, onMoveStage, onAddNote, onReject, onSchedule }) {
  const [dragOver, setDragOver] = useState(false)
  const needsSchedulingCount = cards.filter((c) => c.needsScheduling).length
  return (
    <div
      className={`flex-shrink-0 w-72 rounded-2xl border ${dragOver ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'} p-3 flex flex-col`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDropCard(stage, e.dataTransfer.getData('applicationId')) }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{stage.name}</h3>
        <span className="text-xs font-medium text-slate-400 bg-white dark:bg-slate-800 rounded-full px-2 py-0.5">{cards.length}</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">
        {PIPELINE_STAGE_CATEGORY_LABELS[stage.category]} {metrics?.avgDaysInStage?.[stage._id] ? `· avg ${metrics.avgDaysInStage[stage._id]}d` : ''}
        {needsSchedulingCount > 0 && <span className="ml-1.5 text-blue-600 dark:text-blue-400 font-medium">· {needsSchedulingCount} need{needsSchedulingCount > 1 ? '' : 's'} scheduling</span>}
      </p>
      <div className="space-y-2 overflow-y-auto max-h-[65vh] pr-0.5">
        {cards.length === 0 && <p className="text-xs text-slate-300 dark:text-slate-600 text-center py-6">No candidates</p>}
        {cards.map((card) => (
          <PipelineCard
            key={card.applicationId} card={card} selected={selected.has(card.applicationId)}
            onToggleSelect={onToggleSelect} onDragStart={(e, c) => e.dataTransfer.setData('applicationId', c.applicationId)}
            onDragEnd={() => {}} onMoveStage={onMoveStage} onAddNote={onAddNote} onReject={onReject} onSchedule={onSchedule}
          />
        ))}
      </div>
    </div>
  )
}

function UnassignedColumn({ cards, selected, onToggleSelect, onMoveStage, onAddNote, onReject, onSchedule }) {
  return (
    <div className="flex-shrink-0 w-72 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-3 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">Needs stage</h3>
        <span className="text-xs font-medium text-amber-600 dark:text-amber-300 bg-white dark:bg-slate-900 rounded-full px-2 py-0.5">{cards.length}</span>
      </div>
      <p className="text-[10px] text-amber-600/80 dark:text-amber-300/80 mb-2">Current stage is inactive or missing</p>
      <div className="space-y-2 overflow-y-auto max-h-[65vh] pr-0.5">
        {cards.map((card) => (
          <PipelineCard
            key={card.applicationId} card={card} selected={selected.has(card.applicationId)} onSchedule={onSchedule}
            onToggleSelect={onToggleSelect} onDragStart={(e, c) => e.dataTransfer.setData('applicationId', c.applicationId)}
            onDragEnd={() => {}} onMoveStage={onMoveStage} onAddNote={onAddNote} onReject={onReject}
          />
        ))}
      </div>
    </div>
  )
}

function BulkMoveDialog({ stages, onClose, onDone }) {
  const [stageId, setStageId] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Bulk Move Stage</h2>
        <select className="input-field" value={stageId} onChange={(e) => setStageId(e.target.value)}>
          <option value="">Select a stage</option>
          {stages.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <div className="flex justify-end gap-3 mt-5">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" disabled={!stageId || saving} onClick={async () => { setSaving(true); await onDone(stageId); setSaving(false) }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Move
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkRecruiterDialog({ recruiters, onClose, onDone }) {
  const [recruiterId, setRecruiterId] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Assign Recruiter</h2>
        <select className="input-field" value={recruiterId} onChange={(e) => setRecruiterId(e.target.value)}>
          <option value="">Unassign</option>
          {recruiters.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
        </select>
        <div className="flex justify-end gap-3 mt-5">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" disabled={saving} onClick={async () => { setSaving(true); await onDone(recruiterId || null); setSaving(false) }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Assign
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkTagDialog({ onClose, onDone }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">Add Tag</h2>
        <input className="input-field" placeholder="e.g. Strong Backend" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex justify-end gap-3 mt-5">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" disabled={!name.trim() || saving} onClick={async () => { setSaving(true); await onDone(name.trim()); setSaving(false) }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Tag
          </button>
        </div>
      </div>
    </div>
  )
}

export function PipelinePage() {
  const user = useAuthStore((s) => s.user)
  const canEditStages = user ? canManageJobs({ role: user.role }) : false
  const canSeeCompensation = user ? canManageCompensation({ role: user.role }) : false
  const [jobs, setJobs] = useState([])
  const [jobId, setJobId] = useState('')
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ recruiter: '', aiMatchMin: '', experienceMin: '', source: '', search: '', tag: '', location: '' })
  const [selected, setSelected] = useState(new Set())
  const [moveStageFor, setMoveStageFor] = useState(null)
  const [addNoteFor, setAddNoteFor] = useState(null)
  const [scheduleFor, setScheduleFor] = useState(null)
  const [assignAssessmentFor, setAssignAssessmentFor] = useState(null)
  const [evaluateAssessmentFor, setEvaluateAssessmentFor] = useState(null)
  const [rejectFor, setRejectFor] = useState(null) // card or 'bulk'
  const [bulkDialog, setBulkDialog] = useState(null) // 'move'|'recruiter'|'tag'|'talent-pool'
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    pipelineApi.listJobs()
      .then((res) => {
        if (!mounted) return
        const list = res.data.data.content || []
        setJobs(list)
        if (list.length && !jobId) setJobId(list[0]._id)
        if (!list.length) setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.response?.data?.message || 'Could not load jobs for the pipeline')
        setLoading(false)
      })
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(() => {
    if (!jobId) return
    setLoading(true)
    setError('')
    const params = { jobId }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    pipelineApi.getBoard(params)
      .then((res) => setBoard(res.data.data))
      .catch((err) => {
        setBoard(null)
        setError(err.response?.data?.message || 'Could not load pipeline board')
      })
      .finally(() => setLoading(false))
  }, [filters, jobId])

  useEffect(load, [load])
  useEffect(() => { setSelected(new Set()) }, [jobId])

  function updateFilter(key, val) { setFilters((f) => ({ ...f, [key]: val })) }
  function toggleSelect(id) { setSelected((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next }) }

  async function moveSingle(applicationId, stageId) {
    await candidateApi.moveStage(applicationId, stageId)
    load()
  }

  async function handleDrop(stage, applicationId) {
    // Native drag/drop is a UI gesture only — the backend re-validates
    // every move (own job, active stage, not a terminal application).
    if (!applicationId) return
    try {
      await moveSingle(applicationId, stage._id)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not move candidate')
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recruitment Pipeline</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Drag candidates between stages, or use Move Stage.</p>
        </div>
        {/* Stage customization (add/rename/reorder/remove, per job) lives on
            the job's own edit form — this just jumps straight to that
            section instead of duplicating the editor here. */}
        {canEditStages && jobId && (
          <Link href={`/hr/recruitment/jobs/${jobId}/edit`} className="btn-secondary">
            <Pencil className="w-4 h-4" /> Edit Stages
          </Link>
        )}
      </div>

      <div className="stat-card !p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select className="input-field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Select a job</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.jobTitle}</option>)}
          </select>
          <select className="input-field" value={filters.recruiter} onChange={(e) => updateFilter('recruiter', e.target.value)}>
            <option value="">All recruiters</option>
            {board?.recruiters?.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <input className="input-field" placeholder="Search candidates..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input type="number" min={0} max={100} className="input-field" placeholder="Min AI Match %" value={filters.aiMatchMin} onChange={(e) => updateFilter('aiMatchMin', e.target.value)} />
          <input type="number" min={0} className="input-field" placeholder="Min Experience" value={filters.experienceMin} onChange={(e) => updateFilter('experienceMin', e.target.value)} />
          <input className="input-field" placeholder="Location" value={filters.location || ''} onChange={(e) => updateFilter('location', e.target.value)} />
          <input className="input-field" placeholder="Tag" value={filters.tag} onChange={(e) => updateFilter('tag', e.target.value)} />
          <select className="input-field" value={filters.source} onChange={(e) => updateFilter('source', e.target.value)}>
            <option value="">All sources</option>
            {APPLICATION_SOURCE_LIST.map((source) => <option key={source} value={source}>{APPLICATION_SOURCE_LABELS[source] || source}</option>)}
          </select>
        </div>
      </div>

      {board && (
        <div className="flex flex-wrap gap-3">
          {board.stages.map((s) => (
            <div key={s._id} className="stat-card !py-2.5 !px-3.5">
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{board.metrics.countsByStage[s._id] || 0}</p>
              <p className="text-[11px] text-slate-400">{s.name}</p>
            </div>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
          <span className="text-sm text-blue-700 dark:text-blue-300">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-2">Clear</button>
            <button onClick={() => setBulkDialog('move')} className="btn-secondary !text-xs !py-1.5"><Scale className="w-3.5 h-3.5" /> Move Stage</button>
            <button onClick={() => setBulkDialog('recruiter')} className="btn-secondary !text-xs !py-1.5"><UserCog className="w-3.5 h-3.5" /> Assign Recruiter</button>
            <button onClick={() => setBulkDialog('tag')} className="btn-secondary !text-xs !py-1.5"><TagIcon className="w-3.5 h-3.5" /> Add Tag</button>
            <button onClick={() => setRejectFor('bulk')} className="btn-secondary !text-xs !py-1.5"><XCircle className="w-3.5 h-3.5 text-red-500" /> Reject</button>
            <button onClick={() => setBulkDialog('talent-pool')} className="btn-secondary !text-xs !py-1.5"><Archive className="w-3.5 h-3.5 text-purple-500" /> Talent Pool</button>
          </div>
        </div>
      )}
      {error && <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      {loading ? (
        <PageLoader />
      ) : !jobs.length ? (
        <div className="stat-card !p-6 text-center">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">No jobs available</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create or open a job first, then candidates can appear in the pipeline.</p>
        </div>
      ) : !board ? (
        <div className="stat-card !p-6 text-center">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Pipeline could not load</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Check the selected job or try again.</p>
        </div>
      ) : board.stages.length === 0 ? (
        <div className="stat-card !p-6 text-center">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">No active stages</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add active pipeline stages to this job before moving candidates.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.stages.map((stage) => (
            <StageColumn
              key={stage._id} stage={stage} cards={stage.cards} metrics={board.metrics}
              selected={selected} onToggleSelect={toggleSelect}
              onDropCard={handleDrop}
              onMoveStage={setMoveStageFor} onAddNote={setAddNoteFor} onReject={setRejectFor} onSchedule={setScheduleFor}
            />
          ))}
          {board.unassigned?.length > 0 && (
            <UnassignedColumn
              cards={board.unassigned} selected={selected} onToggleSelect={toggleSelect}
              onMoveStage={setMoveStageFor} onAddNote={setAddNoteFor} onReject={setRejectFor} onSchedule={setScheduleFor}
            />
          )}
        </div>
      )}

      {board && <AssessmentPanel stages={board.stages} onAssign={setAssignAssessmentFor} onEvaluate={setEvaluateAssessmentFor} />}
      {board && canSeeCompensation && <CompensationPanel stages={board.stages} />}

      {moveStageFor && (
        <MoveStageDialog
          row={{ applicationId: moveStageFor.applicationId, jobId, candidateName: moveStageFor.candidateName, jobTitle: board.job.jobTitle }}
          stages={board.stages}
          onClose={() => setMoveStageFor(null)} onMoved={() => { setMoveStageFor(null); load() }}
        />
      )}
      {addNoteFor && (
        <AddNoteDialog row={{ applicationId: addNoteFor.applicationId, candidateName: addNoteFor.candidateName, jobTitle: board.job.jobTitle }} onClose={() => setAddNoteFor(null)} onAdded={() => { setAddNoteFor(null); load() }} />
      )}
      {scheduleFor && (
        <ScheduleInterviewDialog
          applicationId={scheduleFor.applicationId} candidateName={scheduleFor.candidateName} jobTitle={board.job.jobTitle}
          onClose={() => setScheduleFor(null)} onScheduled={() => { setScheduleFor(null); load() }}
        />
      )}
      {assignAssessmentFor && (
        <AssignAssessmentDialog
          applicationId={assignAssessmentFor.applicationId} candidateName={assignAssessmentFor.candidateName}
          onClose={() => { setAssignAssessmentFor(null); load() }} onAssigned={load}
        />
      )}
      {evaluateAssessmentFor && (
        <EvaluateAssessmentModal
          candidateAssessmentId={evaluateAssessmentFor.assessment.candidateAssessmentId}
          onClose={() => setEvaluateAssessmentFor(null)} onEvaluated={() => { setEvaluateAssessmentFor(null); load() }}
        />
      )}
      {rejectFor && (
        <ReasonDialog
          title={rejectFor === 'bulk' ? `Reject ${selected.size} Candidate(s)` : 'Reject Candidate'}
          reasons={REJECTION_REASON_LIST} confirmLabel="Reject" variant="danger"
          onClose={() => setRejectFor(null)}
          onDone={async (data) => {
            try {
              if (rejectFor === 'bulk') await pipelineApi.bulkAction(Array.from(selected), 'REJECT', data)
              else await candidateApi.reject(rejectFor.applicationId, data)
              setRejectFor(null); setSelected(new Set()); load()
            } catch (err) {
              setError(err.response?.data?.message || 'Reject failed')
            }
          }}
        />
      )}
      {bulkDialog === 'move' && board && (
        <BulkMoveDialog stages={board.stages} onClose={() => setBulkDialog(null)} onDone={async (stageId) => { try { await pipelineApi.bulkMove(Array.from(selected), stageId) } catch (err) { setError(err.response?.data?.message || 'Bulk move failed') } setBulkDialog(null); setSelected(new Set()); load() }} />
      )}
      {bulkDialog === 'recruiter' && board && (
        <BulkRecruiterDialog recruiters={board.recruiters} onClose={() => setBulkDialog(null)} onDone={async (recruiterId) => { try { await pipelineApi.bulkAction(Array.from(selected), 'ASSIGN_RECRUITER', { recruiterId }) } catch (err) { setError(err.response?.data?.message || 'Bulk assign failed') } setBulkDialog(null); setSelected(new Set()); load() }} />
      )}
      {bulkDialog === 'tag' && (
        <BulkTagDialog onClose={() => setBulkDialog(null)} onDone={async (tagName) => { try { await pipelineApi.bulkAction(Array.from(selected), 'ADD_TAG', { tagName }) } catch (err) { setError(err.response?.data?.message || 'Bulk tag failed') } setBulkDialog(null); setSelected(new Set()); load() }} />
      )}
      {bulkDialog === 'talent-pool' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Move to Talent Pool</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Closes {selected.size} application(s) but keeps the candidates available for future openings.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setBulkDialog(null)}>Cancel</button>
              <button className="btn-primary" onClick={async () => { try { await pipelineApi.bulkAction(Array.from(selected), 'TALENT_POOL', {}) } catch (err) { setError(err.response?.data?.message || 'Bulk talent-pool failed') } setBulkDialog(null); setSelected(new Set()); load() }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
