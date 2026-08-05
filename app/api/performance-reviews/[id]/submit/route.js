export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import PerformanceReview from '@/models/PerformanceReview'

export const PUT = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const review = await PerformanceReview.findOne({ _id: params.id, tenantId })
  if (!review) return fail('Review not found', 404)
  if (String(review.reviewer) !== session.userId && !['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('Only the reviewer can submit this review', 403)
  }
  if (review.status === 'SUBMITTED') return fail('Review is already submitted', 400)

  review.status = 'SUBMITTED'
  review.submittedAt = new Date()
  review.updatedBy = session.sub
  await review.save()

  await logAction(session, {
    action: 'PERFORMANCE_REVIEW_SUBMITTED',
    entityType: 'PerformanceReview',
    entityId: review._id,
    description: `Performance review for ${review.periodLabel} submitted`,
  })

  return ok(review, 'Review submitted')
})
