'use client'

import Link from 'next/link'
import { MapPin, Briefcase, Clock, GraduationCap, CalendarDays } from 'lucide-react'

const WORK_MODE_LABELS = { ONSITE: 'Onsite', HYBRID: 'Hybrid', REMOTE: 'Remote' }
const EMPLOYMENT_TYPE_LABELS = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary' }

export function CareerJobCard({ job, companySlug }) {
  const detailHref = `/${companySlug}/careers/${job.slug}`
  const applyHref = `/${companySlug}/careers/${job.slug}/apply`

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3">
      <div>
        <Link href={detailHref} className="text-lg font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
          {job.title}
        </Link>
        {job.department && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{job.department}</p>}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        {job.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
        {job.workMode && <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {WORK_MODE_LABELS[job.workMode] || job.workMode}</span>}
        {job.employmentType && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}</span>}
        {job.minExperience != null && <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {job.minExperience}–{job.maxExperience ?? '?'} yrs</span>}
        {job.postedDate && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Posted {new Date(job.postedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
      </div>

      <div className="flex gap-2 mt-1">
        <Link href={detailHref} className="flex-1 text-center px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          View Job
        </Link>
        <Link href={applyHref} className="flex-1 text-center px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors">
          Apply Now
        </Link>
      </div>
    </div>
  )
}
