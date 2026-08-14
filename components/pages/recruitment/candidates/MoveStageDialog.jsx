'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { jobApi } from '@/services/jobApi'
import { candidateApi } from '@/services/candidateApi'

// "Move Stage" — jumps an application directly to any active stage of its
// own job's pipeline (job_pipeline_stages, Step 3).
export function MoveStageDialog({ row, stages: providedStages, onClose, onMoved }) {
  const [stages, setStages] = useState(providedStages || [])
  const [loading, setLoading] = useState(!providedStages)
  const [selectedStageId, setSelectedStageId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (providedStages) {
      setStages(providedStages)
      setLoading(false)
      return
    }
    jobApi.get(row.jobId)
      .then((res) => setStages(res.data.data.pipelineStages || []))
      .finally(() => setLoading(false))
  }, [providedStages, row.jobId])

  async function handleMove() {
    if (!selectedStageId) return
    setSaving(true)
    setError('')
    try {
      await candidateApi.moveStage(row.applicationId, selectedStageId)
      onMoved()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not move stage')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Move Stage</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{row.candidateName} — {row.jobTitle}</p>

        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {loading ? (
          <p className="text-sm text-slate-400">Loading stages...</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {stages.map((s) => (
              <label key={s._id || s.name} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-300">
                <input type="radio" name="stage" value={s._id} checked={selectedStageId === s._id} onChange={() => setSelectedStageId(s._id)} className="accent-blue-600" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{s.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleMove} disabled={saving || !selectedStageId} className="btn-primary">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Move
          </button>
        </div>
      </div>
    </div>
  )
}
