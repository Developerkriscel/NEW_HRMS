import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Briefcase, Clock, GraduationCap, ArrowLeft } from 'lucide-react'
import { connectDB } from '@/lib/db'
import { ensureTenantModelSchemasLoaded } from '@/lib/tenantModels'
import { getPublicJobBySlug } from '@/lib/publicJobHelpers'

export const dynamic = 'force-dynamic'

const WORK_MODE_LABELS = { ONSITE: 'Onsite', HYBRID: 'Hybrid', REMOTE: 'Remote' }
const EMPLOYMENT_TYPE_LABELS = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary' }

export async function generateMetadata({ params }) {
  await connectDB()
  await ensureTenantModelSchemasLoaded()
  const job = await getPublicJobBySlug(params.companySlug, params.jobSlug)
  if (!job) return { title: 'Job not found — Careers' }
  return { title: `${job.title} at ${job.companyName} — Careers`, description: job.description?.slice(0, 160) }
}

function TextSection({ title, text }) {
  if (!text?.trim()) return null
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h2>
      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  )
}

export default async function PublicJobPage({ params, searchParams }) {
  await connectDB()
  await ensureTenantModelSchemasLoaded()
  const job = await getPublicJobBySlug(params.companySlug, params.jobSlug)
  if (!job) notFound()

  // Forward whatever tracking params (?source=&ref=) got this visitor here
  // through to Apply Now, so the application records the same source.
  const trackingQuery = new URLSearchParams()
  if (searchParams?.source) trackingQuery.set('source', searchParams.source)
  if (searchParams?.ref) trackingQuery.set('ref', searchParams.ref)
  const applyHref = `/${params.companySlug}/careers/${params.jobSlug}/apply${trackingQuery.toString() ? `?${trackingQuery.toString()}` : ''}`

  const salaryText = job.salaryVisible
    ? `${job.currency} ${job.salaryMin?.toLocaleString('en-IN') ?? '?'} – ${job.salaryMax?.toLocaleString('en-IN') ?? '?'}`
    : null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href={`/${params.companySlug}/careers`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> All Open Positions
        </Link>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">{job.companyName}</p>

        {!job.isOpen && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
            This position is no longer accepting applications.
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{job.title}</h1>
            {job.department && <p className="text-slate-500 dark:text-slate-400 mt-1">{job.department} Department</p>}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
              {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>}
              {job.workMode && <span className="inline-flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {WORK_MODE_LABELS[job.workMode] || job.workMode}</span>}
              {job.minExperience != null && <span className="inline-flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> {job.minExperience}–{job.maxExperience ?? '?'} Years</span>}
              {job.employmentType && <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}</span>}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {job.vacancies > 1 && <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">{job.vacancies} Openings</span>}
              {salaryText && <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">{salaryText}</span>}
              {job.freshersAllowed && <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">Freshers welcome</span>}
              {job.applicationDeadline && <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">Apply by {new Date(job.applicationDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-6">
            <TextSection title="About the Role" text={job.description} />
            <TextSection title="Responsibilities" text={job.responsibilities} />

            {job.requiredSkills.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Required Skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((s) => <span key={s} className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">{s}</span>)}
                </div>
              </div>
            )}
            {job.preferredSkills.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Preferred Skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.preferredSkills.map((s) => <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">{s}</span>)}
                </div>
              </div>
            )}

            <TextSection title="Qualifications" text={job.requiredQualifications} />
            <TextSection title="Benefits" text={job.benefits} />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            {job.isOpen ? (
              <Link href={applyHref} className="inline-block w-full sm:w-auto text-center px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium transition-colors">
                Apply Now
              </Link>
            ) : (
              <button disabled className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed">
                Applications Closed
              </button>
            )}
            <p className="text-xs text-slate-400 mt-2">Job Ref: {job.jobCode}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
