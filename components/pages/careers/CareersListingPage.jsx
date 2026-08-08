'use client'

import { useEffect, useState } from 'react'
import { Search, Briefcase } from 'lucide-react'
import { CareerJobCard } from './CareerJobCard'
import { publicCareersApi } from '@/services/publicCareersApi'

const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE']
const WORK_MODE_LABELS = { ONSITE: 'Onsite', HYBRID: 'Hybrid', REMOTE: 'Remote' }
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY']
const EMPLOYMENT_TYPE_LABELS = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary' }

export function CareersListingPage({ companySlug }) {
  const [jobs, setJobs] = useState([])
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filters, setFilters] = useState({ department: '', location: '', workMode: '', employmentType: '', experience: '', search: '' })

  const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))]
  const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))]

  function load() {
    setLoading(true)
    const params = {}
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    publicCareersApi.listJobs(companySlug, params)
      .then((res) => {
        setCompanyName(res.data.data.companyName)
        setJobs(res.data.data.jobs)
      })
      .catch((err) => { if (err.response?.status === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [filters, companySlug])

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
  }
  function clearFilters() {
    setFilters({ department: '', location: '', workMode: '', employmentType: '', experience: '', search: '' })
  }
  const hasActiveFilters = Object.values(filters).some(Boolean)

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">This careers page doesn&apos;t exist.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{companyName || 'Careers'}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">Open Positions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Find your next role with us.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input-field pl-9"
              placeholder="Search by job title, skill or department..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <select className="input-field" value={filters.department} onChange={(e) => updateFilter('department', e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="input-field" value={filters.location} onChange={(e) => updateFilter('location', e.target.value)}>
              <option value="">All Locations</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className="input-field" value={filters.workMode} onChange={(e) => updateFilter('workMode', e.target.value)}>
              <option value="">All Work Modes</option>
              {WORK_MODES.map((w) => <option key={w} value={w}>{WORK_MODE_LABELS[w]}</option>)}
            </select>
            <select className="input-field" value={filters.employmentType} onChange={(e) => updateFilter('employmentType', e.target.value)}>
              <option value="">All Types</option>
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>)}
            </select>
            <input type="number" min={0} className="input-field" placeholder="Experience (yrs)" value={filters.experience} onChange={(e) => updateFilter('experience', e.target.value)} />
          </div>
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button type="button" onClick={clearFilters} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Clear filters</button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-16">Loading open positions...</p>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">{hasActiveFilters ? 'No positions match these filters.' : 'No open positions right now — check back soon.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {jobs.map((job) => <CareerJobCard key={job.id} job={job} companySlug={companySlug} />)}
          </div>
        )}
      </div>
    </div>
  )
}
