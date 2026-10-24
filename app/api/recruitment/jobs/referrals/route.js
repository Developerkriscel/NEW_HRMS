export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { PUBLISHING_CHANNEL, PUBLICATION_STATUS, CHANNEL_SOURCE_KEY } from '@/lib/publishingConstants'
import { computeRemainingOpenings } from '@/lib/jobConstants'
import { buildTrackingUrl, jobSlugFor } from '@/lib/publicJobHelpers'
import Job from '@/models/Job'
import JobPublication from '@/models/JobPublication'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'
import '@/models/Branch'
import '@/models/Department'

// Employee/Manager Portal -> Referrals. Any authenticated tenant employee can
// see referral-published jobs and gets their own tracked public application link.
export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const [activePublications, employee, tenant] = await Promise.all([
    JobPublication.find({
      tenantId,
      channel: PUBLISHING_CHANNEL.REFERRAL,
      status: PUBLICATION_STATUS.PUBLISHED,
    }).select('jobId trackingCode externalUrl').lean(),
    Employee.findOne({ _id: session.userId, tenantId, deleted: false }).select('employeeCode').lean(),
    Tenant.findById(tenantId).select('_id tenantCode companyName subdomain').lean(),
  ])

  const jobIds = activePublications.map((p) => p.jobId)
  if (!jobIds.length) return ok([])

  const publicationByJobId = new Map(activePublications.map((p) => [String(p.jobId), p]))
  const jobs = await Job.find({ _id: { $in: jobIds }, tenantId, deleted: false, status: 'OPEN', visibility: 'PUBLIC' })
    .populate('department', 'name')
    .populate('location', 'name')
    .sort({ createdAt: -1 })
    .lean()

  const listings = jobs.map((job) => {
    const publication = publicationByJobId.get(String(job._id))
    const referralUrl = employee?.employeeCode && tenant
      ? buildTrackingUrl(tenant, job, CHANNEL_SOURCE_KEY.REFERRAL, { ref: employee.employeeCode })
      : null

    return {
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
      referralUrl,
      referralCode: employee?.employeeCode || null,
      canRefer: !!referralUrl,
      publicationUrl: publication?.externalUrl || referralUrl,
      trackingCode: publication?.trackingCode || jobSlugFor(job),
    }
  })

  return ok(listings)
})
