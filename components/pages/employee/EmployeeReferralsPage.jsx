'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, Briefcase, UserPlus, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/store/uiStore'
import { publishingApi } from '@/services/publishingApi'
import { JOB_EMPLOYMENT_TYPE_LABELS } from '@/lib/jobConstants'

function absoluteUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function EmployeeReferralsPage() {
  const addNotification = useUIStore((s) => s.addNotification)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadJobs = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await publishingApi.listReferralJobs()
      setJobs(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load referral jobs')
      setJobs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const referralCode = useMemo(() => jobs.find((job) => job.referralCode)?.referralCode || null, [jobs])

  async function handleCopy(job) {
    if (!job.canRefer || !job.referralUrl) {
      addNotification({ title: 'Referral unavailable', message: 'Your employee code is missing. Contact HR to generate referral links.', type: 'warning' })
      return
    }

    const link = absoluteUrl(job.referralUrl)
    try {
      await navigator.clipboard.writeText(link)
      addNotification({ title: 'Referral link copied', message: `Share this link for ${job.title}.`, type: 'success' })
    } catch {
      addNotification({ title: 'Copy failed', message: link, type: 'info' })
    }
  }

  function handleOpen(job) {
    if (!job.canRefer || !job.referralUrl) {
      addNotification({ title: 'Referral unavailable', message: 'Your employee code is missing. Contact HR to generate referral links.', type: 'warning' })
      return
    }
    window.open(absoluteUrl(job.referralUrl), '_blank', 'noopener,noreferrer')
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-300 hover:scale-[1.02] transition-transform duration-300 relative w-fit pb-2 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/3 after:h-1 after:bg-gradient-to-r after:from-indigo-500 after:to-transparent after:rounded-full">Referrals</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Open positions you can refer people you know for.</p>
          {referralCode && <p className="text-xs text-slate-400 mt-1">Your referral code: <span className="font-mono font-semibold">{referralCode}</span></p>}
        </div>
        <button type="button" onClick={() => loadJobs({ silent: true })} className="btn-secondary" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="stat-card text-center py-16">
          <UserPlus className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">No open referral positions right now</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">Check back soon. HR publishes referral roles here as they open up.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div key={job._id} className="stat-card space-y-3">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{job.title}</h3>
                <p className="text-xs text-slate-400">{job.department || 'Department not set'}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                {job.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>}
                {job.employmentType && <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {JOB_EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}</span>}
              </div>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-slate-600 dark:text-slate-300">{job.remainingOpenings} Opening{job.remainingOpenings === 1 ? '' : 's'}</span>
                {job.minExperience != null && <span className="text-slate-400 text-xs">{job.minExperience}-{job.maxExperience ?? '?'} yrs</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleCopy(job)} disabled={!job.canRefer} className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                  <Copy className="w-4 h-4" /> Copy Link
                </button>
                <button type="button" onClick={() => handleOpen(job)} disabled={!job.canRefer} className="btn-secondary justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                  <ExternalLink className="w-4 h-4" /> Open
                </button>
              </div>
              {!job.canRefer && <p className="text-xs text-amber-600 dark:text-amber-400">Referral link unavailable because your employee code is missing.</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
