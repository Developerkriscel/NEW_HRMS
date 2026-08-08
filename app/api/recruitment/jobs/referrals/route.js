export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { PUBLISHING_CHANNEL, PUBLICATION_STATUS } from '@/lib/publishingConstants'
import { computeRemainingOpenings } from '@/lib/jobConstants'
import Job from '@/models/Job'
import JobPublication from '@/models/JobPublication'

// Employee Portal -> Jobs / Referrals. Any authenticated tenant employee
// can see this (that's the entire point of a referral program) — no
// job.publish-style RBAC gate here, unlike the recruiter-facing Publishing
// tab. Referral candidate submission isn't built yet — this only prepares
// the listing per Step 4's scope.
export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const activePublications = await JobPublication.find({
    tenantId, channel: PUBLISHING_CHANNEL.REFERRAL, status: PUBLICATION_STATUS.PUBLISHED,
  }).select('jobId')

  const jobIds = activePublications.map((p) => p.jobId)
  const jobs = await Job.find({ _id: { $in: jobIds }, tenantId, deleted: false, status: 'OPEN' })
    .populate('department', 'name')
    .populate('location', 'name')
    .sort({ createdAt: -1 })

  const listings = jobs.map((job) => ({
    _id: job._id,
    jobCode: job.jobCode,
    title: job.publicTitle || job.jobTitle,
    department: job.department?.name || null,
    location: job.location?.name || null,
    workMode: job.workMode,
    employmentType: job.employmentType,
    minExperience: job.minExperience,
    maxExperience: job.maxExperience,
    remainingOpenings: computeRemainingOpenings(job),
  }))

  return ok(listings)
})
