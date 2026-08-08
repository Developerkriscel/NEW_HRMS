'use client'

import { useEffect, useState } from 'react'
import { MapPin, Briefcase, UserPlus } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/store/uiStore'
import { publishingApi } from '@/services/publishingApi'
import { JOB_EMPLOYMENT_TYPE_LABELS } from '@/lib/jobConstants'

// Employee Portal -> Jobs / Referrals. Referral candidate submission isn't
// built yet (Step 4 stops at "prepare the listing") — [Refer Candidate] is
// a placeholder for now.
export function EmployeeReferralsPage() {
  const addNotification = useUIStore((s) => s.addNotification)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    publishingApi.listReferralJobs()
      .then((res) => setJobs(res.data.data || []))
      .finally(() => setLoading(false))
  }, [])

  function handleRefer(job) {
    addNotification({ title: 'Coming soon', message: `Referring a candidate for ${job.title} isn't built yet.`, type: 'info' })
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Referrals</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Open positions you can refer people you know for.</p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="stat-card text-center py-16">
          <UserPlus className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">No open referral positions right now</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">Check back soon — HR publishes roles here as they open up.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div key={job._id} className="stat-card space-y-3">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{job.title}</h3>
                <p className="text-xs text-slate-400">{job.department}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                {job.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
                {job.employmentType && <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {JOB_EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}</span>}
              </div>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-slate-600 dark:text-slate-300">{job.remainingOpenings} Opening{job.remainingOpenings === 1 ? '' : 's'}</span>
                {job.minExperience != null && <span className="text-slate-400 text-xs">{job.minExperience}–{job.maxExperience ?? '?'} yrs</span>}
              </div>
              <button type="button" onClick={() => handleRefer(job)} className="btn-primary w-full justify-center">
                <UserPlus className="w-4 h-4" /> Refer Candidate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
