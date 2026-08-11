'use client'

import { X, GraduationCap, Award } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'
import { cn } from '@/lib/utils'
import { PROFILE_RECORD_SOURCE_LABELS } from '@/lib/candidateConstants'

function SourceTag({ source }) {
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', source === 'RESUME' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
      {PROFILE_RECORD_SOURCE_LABELS[source] || source}
    </span>
  )
}

export function EducationTab({ candidateId, education, certifications, onChanged }) {
  async function remove(section, id) {
    await candidateApi.deleteProfileItem(candidateId, section, id)
    onChanged()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Education</h3>
        {education.length === 0 ? (
          <div className="stat-card text-center py-10">
            <GraduationCap className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No education recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {education.map((e) => (
              <div key={e._id} className="stat-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{e.degree}{e.specialization ? ` — ${e.specialization}` : ''}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{e.institution || '—'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {e.startYear || '—'} – {e.endYear || '—'} {e.score ? `· ${e.score}` : ''}
                    </p>
                    <div className="mt-2"><SourceTag source={e.source} /></div>
                  </div>
                  <button onClick={() => remove('education', e._id)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Certifications</h3>
        {certifications.length === 0 ? (
          <div className="stat-card text-center py-10">
            <Award className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No certifications recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {certifications.map((c) => (
              <div key={c._id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {c.issuer && <span className="text-xs text-slate-400">{c.issuer}</span>}
                    <SourceTag source={c.source} />
                  </div>
                </div>
                <button onClick={() => remove('certifications', c._id)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
