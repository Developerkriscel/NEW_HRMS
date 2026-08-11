'use client'

import { useState } from 'react'
import { Plus, X, ShieldCheck, Loader2 } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'
import { cn } from '@/lib/utils'
import { LOW_CONFIDENCE_THRESHOLD, PROFILE_RECORD_SOURCE_LABELS } from '@/lib/candidateConstants'

export function SkillsTab({ candidateId, skills, onChanged }) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function addSkill() {
    const skillName = draft.trim()
    if (!skillName) return
    setSaving(true)
    setError('')
    try {
      await candidateApi.addSkill(candidateId, { skillName })
      setDraft('')
      onChanged()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add skill')
    } finally {
      setSaving(false)
    }
  }

  async function removeSkill(skillId) {
    await candidateApi.deleteProfileItem(candidateId, 'skills', skillId)
    onChanged()
  }

  async function verifySkill(skillId) {
    await candidateApi.updateProfileItem(candidateId, 'skills', skillId, { isVerified: true })
    onChanged()
  }

  return (
    <div className="stat-card space-y-4">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <input className="input-field" placeholder="Add a skill (e.g. Node.js)" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} />
        <button type="button" onClick={addSkill} disabled={saving} className="btn-secondary !px-3">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</button>
      </div>

      {skills.length === 0 ? (
        <p className="text-sm text-slate-400">No skills recorded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {skills.map((s) => {
            const low = s.source === 'RESUME' && s.confidence != null && s.confidence < LOW_CONFIDENCE_THRESHOLD
            return (
              <div key={s._id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {s.skillName}
                    {s.yearsOfExperience != null && <span className="text-slate-400 font-normal"> · {s.yearsOfExperience} yrs</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', s.source === 'RESUME' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                      {PROFILE_RECORD_SOURCE_LABELS[s.source] || s.source}
                    </span>
                    {s.isVerified ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400"><ShieldCheck className="w-3 h-3" /> Verified</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Not Verified</span>
                    )}
                    {low && <span className="text-[10px] text-amber-600 dark:text-amber-400">Needs Review</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!s.isVerified && (
                    <button onClick={() => verifySkill(s._id)} title="Mark verified" className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => removeSkill(s._id)} title="Remove" className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
