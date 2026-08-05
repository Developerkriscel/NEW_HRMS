export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import PerformanceReview from '@/models/PerformanceReview'

const EDITABLE_FIELDS = [
  'attendanceNotes', 'ratings', 'overallRating', 'feedback', 'trainingRecommended',
  'trainingNotes', 'promotionRecommended', 'incrementRecommended', 'incrementPercent',
  'pipRequired', 'pipPlan', 'kraScore',
]

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const review = await PerformanceReview.findOne({ _id: params.id, tenantId })
    .populate('employee', 'firstName lastName employeeCode')
    .populate('reviewer', 'firstName lastName')
  if (!review) return fail('Review not found', 404)

  const isOwner = String(review.employee._id) === session.userId
  const isReviewer = String(review.reviewer._id) === session.userId
  if (isOwner && review.status !== 'SUBMITTED') return fail('Review not found', 404)
  if (!isOwner && !isReviewer && !['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('You do not have access to this review', 403)
  }

  return ok(review)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const review = await PerformanceReview.findOne({ _id: params.id, tenantId })
  if (!review) return fail('Review not found', 404)
  if (String(review.reviewer) !== session.userId && !['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('Only the reviewer can edit this review', 403)
  }
  if (review.status === 'SUBMITTED') return fail('A submitted review cannot be edited', 400)

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) review[field] = body[field]
  }
  review.updatedBy = session.sub
  await review.save()

  await logAction(session, {
    action: 'PERFORMANCE_REVIEW_UPDATED',
    entityType: 'PerformanceReview',
    entityId: review._id,
    description: 'Performance review draft updated',
  })

  return ok(review, 'Review updated')
})
