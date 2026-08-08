// Server-only helpers for the public career pages — slug generation, the
// public-safe job payload (never internal budget/notes/requisition/
// screening-rule data), and resolving a public URL back to a tenant + job.
import Tenant from '@/models/Tenant'
import JobPublication from '@/models/JobPublication'
import Job from '@/models/Job'
import JobSkill from '@/models/JobSkill'
import JobScreeningQuestion from '@/models/JobScreeningQuestion'
import JobApplicationField from '@/models/JobApplicationField'
import { runForTenant } from './tenantDb'
import { PUBLICATION_STATUS, PUBLISHING_CHANNEL } from './publishingConstants'

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'job'
}

export function companySlugFor(tenant) {
  return tenant.subdomain || slugify(tenant.tenantCode)
}

// e.g. "backend-developer-job-2026-0001" — the trailing jobCode segment is
// what getPublicJobBySlug actually keys off of (via the stored
// JobPublication.trackingCode), not string-parsing the slug back apart.
export function jobSlugFor(job) {
  const title = job.publicTitle || job.jobTitle
  return `${slugify(title)}-${String(job.jobCode).toLowerCase()}`
}

// /{company-slug}/careers/{job-slug} — Step 5's URL shape.
export function careerPagePath(tenant, job) {
  return `/${companySlugFor(tenant)}/careers/${jobSlugFor(job)}`
}

export function buildTrackingUrl(tenant, job, sourceKey, extraParams = {}) {
  const params = new URLSearchParams({ source: sourceKey, ...extraParams })
  return `${careerPagePath(tenant, job)}?${params.toString()}`
}

async function resolveTenantBySlug(companySlug) {
  return Tenant.findOne({
    deleted: false,
    $or: [{ subdomain: companySlug }, { tenantCode: new RegExp(`^${companySlug}$`, 'i') }],
  }).lean()
}

// Lightweight shape for listing cards.
function buildPublicJobSummary({ job, slug }) {
  return {
    id: String(job._id),
    slug,
    jobCode: job.jobCode,
    title: job.publicTitle || job.jobTitle,
    department: job.department?.name || null,
    location: job.location?.name || null,
    workMode: job.workMode,
    employmentType: job.employmentType,
    minExperience: job.minExperience,
    maxExperience: job.maxExperience,
    postedDate: job.openingDate || job.createdAt,
  }
}

// Whitelist only — this is the one function standing between the DB and an
// unauthenticated visitor. Internal budget, requisition/approval details,
// hiring-manager/recruiter names, and knockout screening rules never pass
// through here on purpose.
function buildPublicJobDetail({ job, tenant, slug, requiredSkills = [], preferredSkills = [], screeningQuestions = [], applicationFields = [] }) {
  return {
    ...buildPublicJobSummary({ job, slug }),
    description: job.publicDescription || job.jobSummary,
    responsibilities: job.responsibilities,
    requiredQualifications: job.requiredQualifications,
    preferredQualifications: job.preferredQualifications,
    benefits: job.benefits,
    perks: job.perks,
    freshersAllowed: !!job.freshersAllowed,
    salaryVisible: !!job.publicSalaryVisible,
    salaryMin: job.publicSalaryVisible ? job.publicMinCtc : null,
    salaryMax: job.publicSalaryVisible ? job.publicMaxCtc : null,
    currency: job.currency || 'INR',
    vacancies: job.totalOpenings,
    applicationDeadline: job.applicationDeadline,
    requiredSkills: requiredSkills.map((s) => s.skillName),
    preferredSkills: preferredSkills.map((s) => s.skillName),
    companyName: tenant.companyName,
    isOpen: job.status === 'OPEN',
    // Public-safe subset — isKnockout/rule are screening internals HR
    // configured and never surface to the candidate answering them.
    screeningQuestions: screeningQuestions.map((q) => ({
      id: String(q._id), question: q.question, type: q.type, options: q.options || [], isRequired: q.isRequired,
    })),
    applicationFields: applicationFields.map((f) => ({ fieldName: f.fieldName, requirement: f.requirement })),
  }
}

// Listing — every OPEN + PUBLIC job with an active, PUBLISHED career-page
// row for this tenant. Filters are plain human-readable strings (visitors
// don't know internal department/location ids).
export async function getPublicJobsList(companySlug, filters = {}) {
  const tenant = await resolveTenantBySlug(companySlug)
  if (!tenant) return null

  return runForTenant(tenant, async () => {
    const publications = await JobPublication.find({
      channel: PUBLISHING_CHANNEL.CAREER_PAGE, status: PUBLICATION_STATUS.PUBLISHED,
    }).select('jobId trackingCode').lean()
    if (!publications.length) return { companyName: tenant.companyName, jobs: [] }

    const slugByJobId = new Map(publications.map((p) => [String(p.jobId), p.trackingCode]))
    let jobs = await Job.find({
      _id: { $in: publications.map((p) => p.jobId) }, deleted: false, status: 'OPEN', visibility: 'PUBLIC',
    })
      .populate('department', 'name')
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .lean()

    if (filters.department) jobs = jobs.filter((j) => (j.department?.name || '').toLowerCase() === filters.department.toLowerCase())
    if (filters.location) jobs = jobs.filter((j) => (j.location?.name || '').toLowerCase() === filters.location.toLowerCase())
    if (filters.workMode) jobs = jobs.filter((j) => j.workMode === filters.workMode)
    if (filters.employmentType) jobs = jobs.filter((j) => j.employmentType === filters.employmentType)
    if (filters.experience) {
      const years = Number(filters.experience)
      if (Number.isFinite(years)) jobs = jobs.filter((j) => (j.minExperience ?? 0) <= years && years <= (j.maxExperience ?? 99))
    }

    if (filters.search) {
      const term = filters.search.toLowerCase()
      const matchingSkillJobIds = new Set(
        (await JobSkill.find({ tenantId: tenant._id, skillName: new RegExp(term, 'i') }).select('jobId').lean())
          .map((s) => String(s.jobId))
      )
      jobs = jobs.filter((j) =>
        (j.publicTitle || j.jobTitle || '').toLowerCase().includes(term) ||
        (j.department?.name || '').toLowerCase().includes(term) ||
        matchingSkillJobIds.has(String(j._id))
      )
    }

    return {
      companyName: tenant.companyName,
      jobs: jobs.map((job) => buildPublicJobSummary({ job, slug: slugByJobId.get(String(job._id)) })),
    }
  })
}

// The only place an unauthenticated request is allowed to reach into a
// tenant's database for one job's full detail — and only ever for a job
// with an active, PUBLISHED career-page row for this exact slug.
export async function getPublicJobBySlug(companySlug, jobSlug) {
  if (!companySlug || !jobSlug) return null
  const tenant = await resolveTenantBySlug(companySlug)
  if (!tenant) return null

  return runForTenant(tenant, async () => {
    const publication = await JobPublication.findOne({
      channel: PUBLISHING_CHANNEL.CAREER_PAGE, trackingCode: jobSlug, status: PUBLICATION_STATUS.PUBLISHED,
    }).lean()
    if (!publication) return null

    const job = await Job.findOne({ _id: publication.jobId, deleted: false })
      .populate('department', 'name')
      .populate('location', 'name')
      .lean()
    // Visibility must allow public applications (Step 5 Rule) — a stale
    // PUBLISHED row on a since-made-CONFIDENTIAL job shouldn't render.
    if (!job || job.visibility !== 'PUBLIC') return null

    const [skills, screeningQuestions, applicationFields] = await Promise.all([
      JobSkill.find({ tenantId: tenant._id, jobId: job._id }).lean(),
      JobScreeningQuestion.find({ tenantId: tenant._id, jobId: job._id }).sort({ order: 1 }).lean(),
      JobApplicationField.find({ tenantId: tenant._id, jobId: job._id }).lean(),
    ])

    return buildPublicJobDetail({
      job, tenant, slug: jobSlug,
      requiredSkills: skills.filter((s) => s.type === 'REQUIRED'),
      preferredSkills: skills.filter((s) => s.type === 'PREFERRED'),
      screeningQuestions, applicationFields,
    })
  })
}

export { resolveTenantBySlug }
