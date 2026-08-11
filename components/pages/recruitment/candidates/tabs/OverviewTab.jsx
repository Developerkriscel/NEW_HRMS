'use client'

import { MapPin, Building2, Briefcase } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { RESUME_PARSING_STATUS_LABELS } from '@/lib/candidateConstants'

export function OverviewTab({ candidate, skills, resumes }) {
  const primaryResume = resumes.find((r) => r.isPrimary) || resumes[0] || null
  const headline = candidate.currentDesignation ? `${candidate.currentDesignation} Candidate` : 'Candidate'
  const topSkills = skills.slice(0, 10)

  return (
    <div className="space-y-4">
      <div className="stat-card space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{candidate.getFullName ? candidate.getFullName() : `${candidate.firstName} ${candidate.lastName}`.trim()}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{headline}</p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
          {candidate.totalExperience != null && (
            <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" /> {candidate.totalExperience} Years Experience</span>
          )}
          {candidate.currentLocation && (
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {candidate.currentLocation}</span>
          )}
          {candidate.currentCompany && (
            <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-400" /> Current: {candidate.currentCompany}</span>
          )}
        </div>
      </div>

      <div className="stat-card space-y-2.5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Skills</h3>
        {topSkills.length === 0 ? (
          <p className="text-sm text-slate-400">No skills recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((s) => (
              <span key={s._id} className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">{s.skillName}</span>
            ))}
          </div>
        )}
      </div>

      <div className="stat-card space-y-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Resume Parsing Status</h3>
        {primaryResume ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">{primaryResume.originalFileName || primaryResume.fileName}</span>
            <Badge variant={primaryResume.parsingStatus}>{RESUME_PARSING_STATUS_LABELS[primaryResume.parsingStatus]}</Badge>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No resume on file.</p>
        )}
      </div>
    </div>
  )
}
