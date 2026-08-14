export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, APPLICATION_STATUS, CANDIDATE_STATUS, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { REJECTION_REASON_LIST } from '@/lib/matchingConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import Candidate from '@/models/Candidate'
import Employee from '@/models/Employee'
import CandidateTag from '@/models/CandidateTag'
import CandidateTagAssignment from '@/models/CandidateTagAssignment'

const TERMINAL = [APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED]
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// POST { applicationIds, action: 'ASSIGN_RECRUITER'|'ADD_TAG'|'REJECT'|'TALENT_POOL', payload }
// The other four bulk actions from item 13 (bulk Move Stage has its own
// dedicated /bulk-move route, matching the spec's literal API list).
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const applicationIds = Array.isArray(body.applicationIds) ? body.applicationIds : []
  if (!applicationIds.length) return fail('No applications selected', 400, 'VALIDATION_ERROR')

  const applications = await Application.find({ _id: { $in: applicationIds }, tenantId, deleted: false })
  const actorName = await getActorName(session)
  let succeeded = 0
  const skipped = []

  if (body.action === 'ASSIGN_RECRUITER') {
    let recruiter = null
    if (body.payload?.recruiterId) {
      recruiter = await Employee.findOne({ _id: body.payload.recruiterId, tenantId, deleted: false }).select('firstName lastName')
      if (!recruiter) return fail('Recruiter not found', 404, 'NOT_FOUND')
    }
    for (const application of applications) {
      application.assignedRecruiterId = recruiter?._id || null
      application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: recruiter ? `Assigned to ${recruiter.firstName} ${recruiter.lastName} by ${actorName} (bulk)` : `Unassigned by ${actorName} (bulk)`, actorName })
      await application.save()
      succeeded++
    }
  } else if (body.action === 'ADD_TAG') {
    const tagName = body.payload?.tagName?.trim()
    if (!tagName) return fail('tagName is required', 400, 'VALIDATION_ERROR')
    const tag = await CandidateTag.findOneAndUpdate(
      { tenantId, name: { $regex: `^${escapeRegex(tagName)}$`, $options: 'i' } },
      { $setOnInsert: { tenantId, name: tagName } },
      { upsert: true, new: true }
    )
    for (const application of applications) {
      await CandidateTagAssignment.updateOne(
        { tenantId, candidateId: application.candidateId, tagId: tag._id },
        { $setOnInsert: { tenantId, candidateId: application.candidateId, tagId: tag._id, assignedBy: session.sub } },
        { upsert: true }
      )
      succeeded++
    }
  } else if (body.action === 'REJECT') {
    const reason = body.payload?.reason
    if (!reason || !REJECTION_REASON_LIST.includes(reason)) return fail('A valid rejection reason is required', 400, 'VALIDATION_ERROR')
    if (reason === 'Other' && !body.payload?.comment?.trim()) return fail('A comment is required when the reason is "Other"', 400, 'VALIDATION_ERROR')
    for (const application of applications) {
      if (TERMINAL.includes(application.status)) { skipped.push({ id: application._id, reason: `Already ${application.status.toLowerCase()}` }); continue }
      application.status = APPLICATION_STATUS.REJECTED
      application.rejectionReason = reason
      application.rejectionComment = body.payload?.comment || null
      application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Rejected by ${actorName} (bulk)`, comment: `Reason: ${reason}`, actorName })
      await application.save()
      await recordStageHistory({
        tenantId, application, fromStageId: application.currentStage, toStageId: null,
        fromStageName: application.currentStageName, toStageName: 'Rejected', action: STAGE_HISTORY_ACTION.REJECTED, comment: reason, session,
      })
      succeeded++
    }
  } else if (body.action === 'TALENT_POOL') {
    for (const application of applications) {
      if ([APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) { skipped.push({ id: application._id, reason: `Already ${application.status.toLowerCase()}` }); continue }
      const candidate = await Candidate.findOne({ _id: application.candidateId, tenantId, deleted: false })
      if (!candidate) { skipped.push({ id: application._id, reason: 'Candidate not found' }); continue }
      application.status = APPLICATION_STATUS.REJECTED
      application.rejectionReason = application.rejectionReason || 'Position closed'
      application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Moved to Talent Pool by ${actorName} (bulk)`, actorName })
      await application.save()
      candidate.status = CANDIDATE_STATUS.TALENT_POOL
      candidate.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Moved to Talent Pool by ${actorName} (bulk)`, actorName })
      await candidate.save()
      await recordStageHistory({
        tenantId, application, fromStageId: application.currentStage, toStageId: null,
        fromStageName: application.currentStageName, toStageName: 'Talent Pool', action: STAGE_HISTORY_ACTION.TALENT_POOL, session,
      })
      succeeded++
    }
  } else {
    return fail('Unknown bulk action', 400, 'VALIDATION_ERROR')
  }

  await logAction(session, { action: `APPLICATIONS_BULK_${body.action}`, entityType: 'Application', entityId: null, description: `Bulk ${body.action} on ${succeeded} application(s)`, req })

  return ok({ succeeded, skipped }, `${body.action.replace('_', ' ').toLowerCase()} applied to ${succeeded} application(s)`)
})
