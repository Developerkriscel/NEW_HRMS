'use client'

import { X, MapPin, Briefcase, Clock } from 'lucide-react'
import {
  JOB_EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS,
} from '@/lib/jobConstants'

// Purely a client-side render of the current form state — lets HR see how
// the posting will read publicly before anything is actually published.
// Step 4 will make this real; for now it's preview only.
export function JobPreviewModal({ formData, locationName, onClose }) {
  const salaryText = formData.publicSalaryVisible
    ? (formData.publicMinCtc || formData.publicMaxCtc)
      ? `${formData.currency || 'INR'} ${formData.publicMinCtc || '?'}${formData.publicMaxCtc ? ` – ${formData.publicMaxCtc}` : ''}`
      : 'Not Disclosed'
    : 'Not Disclosed'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Public Preview</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How this job will appear</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{formData.jobTitle || 'Untitled Job'}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
              {locationName && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {locationName}</span>}
              {formData.workMode && <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {WORK_MODE_LABELS[formData.workMode]}</span>}
              {formData.employmentType && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {JOB_EMPLOYMENT_TYPE_LABELS[formData.employmentType]}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-slate-400">Experience: </span><span className="font-medium text-slate-700 dark:text-slate-200">{formData.minExperience ?? '?'}–{formData.maxExperience ?? '?'} years</span></div>
            <div><span className="text-slate-400">Salary: </span><span className="font-medium text-slate-700 dark:text-slate-200">{salaryText}</span></div>
            <div><span className="text-slate-400">Freshers: </span><span className="font-medium text-slate-700 dark:text-slate-200">{formData.freshersAllowed ? 'Allowed' : 'Not preferred'}</span></div>
          </div>

          {formData.requiredSkills?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {formData.requiredSkills.map((s) => (
                  <span key={s.skillName} className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                    {s.skillName}{s.minYears ? ` · ${s.minYears}y` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {[
            ['About the Role', formData.aboutRole],
            ['Job Summary', formData.jobSummary],
            ['Responsibilities', formData.responsibilities],
            ['Required Qualifications', formData.requiredQualifications],
            ['Preferred Qualifications', formData.preferredQualifications],
            ['Benefits', formData.benefits],
            ['Perks', formData.perks],
          ].filter(([, text]) => text?.trim()).map(([title, text]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
