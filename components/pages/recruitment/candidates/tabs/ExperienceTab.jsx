'use client'

import { X, Briefcase, FolderGit2 } from 'lucide-react'
import { candidateApi } from '@/services/candidateApi'
import { cn, formatDate } from '@/lib/utils'
import { LOW_CONFIDENCE_THRESHOLD, PROFILE_RECORD_SOURCE_LABELS } from '@/lib/candidateConstants'

function SourceTag({ source }) {
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', source === 'RESUME' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
      {PROFILE_RECORD_SOURCE_LABELS[source] || source}
    </span>
  )
}

export function ExperienceTab({ candidateId, experience, projects = [], onChanged }) {
  async function remove(section, id) {
    await candidateApi.deleteProfileItem(candidateId, section, id)
    onChanged()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Work Experience</h3>
        {experience.length === 0 ? (
          <div className="stat-card text-center py-12">
            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No work experience recorded yet. Accept it from a parsed resume, or it will appear here once one is reviewed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {experience.map((e) => {
              const low = e.source === 'RESUME' && e.confidence != null && e.confidence < LOW_CONFIDENCE_THRESHOLD
              return (
                <div key={e._id} className="stat-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{e.designation || 'Role'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{e.companyName}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {e.startDate ? formatDate(e.startDate, 'MMM yyyy') : '—'} – {e.isCurrent ? 'Present' : e.endDate ? formatDate(e.endDate, 'MMM yyyy') : '—'}
                      </p>
                      {e.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{e.description}</p>}
                      <div className="flex items-center gap-1.5 mt-2">
                        <SourceTag source={e.source} />
                        {low && <span className="text-[10px] text-amber-600 dark:text-amber-400">Needs Review</span>}
                      </div>
                    </div>
                    <button onClick={() => remove('experience', e._id)} title="Remove" className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Projects</h3>
        {projects.length === 0 ? (
          <div className="stat-card text-center py-10">
            <FolderGit2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No projects recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p._id} className="stat-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
                    {p.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{p.description}</p>}
                    {p.technologies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.technologies.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{t}</span>)}
                      </div>
                    )}
                    <div className="mt-2"><SourceTag source={p.source} /></div>
                  </div>
                  <button onClick={() => remove('projects', p._id)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
