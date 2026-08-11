export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  INTERVIEW_VIEW_ROLES, INTERVIEW_MANAGE_ROLES, INTERVIEW_STATUS, PANEL_ROLE, SCHEDULE_HISTORY_ACTION,
} from '@/lib/interviewConstants'
import { ACTIVITY_ENTRY_TYPE, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { checkAvailability } from '@/lib/interviewHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import InterviewScheduleHistory from '@/models/InterviewScheduleHistory'
import Application from '@/models/Application'
import Employee from '@/models/Employee'

// GET — list, with the Interview page's tabs computed server-side from a
// `tab` query param rather than duplicating the same logic client-side.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const tab = searchParams.get('tab') || 'all'
  const job = searchParams.get('job')
  const candidate = searchParams.get('candidate')
  const interviewer = searchParams.get('interviewer')
  const round = searchParams.get('round')
  const mode = searchParams.get('mode')
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const query = { tenantId, deleted: false }
  if (job) query.jobId = job
  if (candidate) query.candidateId = candidate
  if (round) query.roundName = round
  if (mode) query.mode = mode
  if (status) query.status = status

  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999)

  if (tab === 'upcoming') { query.status = { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] }; query.date = { $gte: todayStart } }
  else if (tab === 'today') { query.date = { $gte: todayStart, $lte: todayEnd }; query.status = { $nin: ['CANCELLED'] } }
  else if (tab === 'completed') { query.status = INTERVIEW_STATUS.COMPLETED }
  else if (tab === 'feedbackPending') { query.status = INTERVIEW_STATUS.FEEDBACK_PENDING }
  else if (tab === 'cancelled') { query.status = { $in: ['CANCELLED', 'NO_SHOW'] } }

  if (dateFrom || dateTo) {
    query.date = query.date || {}
    if (dateFrom) query.date.$gte = new Date(dateFrom)
    if (dateTo) query.date.$lte = new Date(dateTo)
  }

  let interviewerFilterIds = null
  if (interviewer) {
    const panelRows = await InterviewPanelMember.find({ tenantId, employeeId: interviewer }).select('interviewId')
    interviewerFilterIds = panelRows.map((p) => p.interviewId)
    query._id = { $in: interviewerFilterIds }
  }

  const totalElements = await Interview.countDocuments(query)
  const interviews = await Interview.find(query)
    .populate('candidateId', 'firstName lastName candidateCode')
    .populate('jobId', 'jobTitle publicTitle')
    .sort({ date: 1, startTime: 1 })
    .skip(page * size).limit(size)

  const panelRows = await InterviewPanelMember.find({ tenantId, interviewId: { $in: interviews.map((i) => i._id) } }).lean()
  const panelByInterview = new Map()
  for (const p of panelRows) {
    const key = String(p.interviewId)
    if (!panelByInterview.has(key)) panelByInterview.set(key, [])
    panelByInterview.get(key).push(p)
  }

  const rows = interviews.map((i) => ({
    _id: i._id, roundName: i.roundName, type: i.type, date: i.date, startTime: i.startTime, endTime: i.endTime, timezone: i.timezone,
    mode: i.mode, meetingProvider: i.meetingProvider, status: i.status,
    candidateId: i.candidateId?._id, candidateName: i.candidateId ? `${i.candidateId.firstName} ${i.candidateId.lastName}` : null,
    jobId: i.jobId?._id, jobTitle: i.jobId?.publicTitle || i.jobId?.jobTitle,
    panel: (panelByInterview.get(String(i._id)) || []).map((p) => ({ employeeId: p.employeeId, name: p.employeeName, role: p.role, feedbackStatus: p.feedbackStatus })),
  }))

  return ok(paged(rows, page, size, totalElements))
})

// POST — Schedule Interview. Availability conflicts are *warned about*,
// never silently allowed to double-book without HR knowing — but per spec
// item 3, a conflict doesn't hard-block scheduling; HR sees it and decides.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const required = ['applicationId', 'roundName', 'type', 'date', 'startTime', 'endTime', 'mode']
  for (const field of required) {
    if (!body[field]) return fail(`${field} is required`, 400, 'VALIDATION_ERROR')
  }
  if (!Array.isArray(body.interviewers) || body.interviewers.length === 0) {
    return fail('At least one interviewer is required', 400, 'VALIDATION_ERROR')
  }

  const application = await Application.findOne({ _id: body.applicationId, tenantId, deleted: false })
  if (!application) return fail('Application not found', 404, 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN].includes(application.status)) {
    return fail(`Cannot schedule an interview for a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  const employeeIds = body.interviewers.map((i) => i.employeeId)
  const availability = await checkAvailability(tenantId, employeeIds, body.date, body.startTime, body.endTime)
  const conflictCount = Object.values(availability).filter((a) => !a.available).length

  const actorName = await getActorName(session)
  const interview = await Interview.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
    pipelineStageId: body.pipelineStageId || application.currentStage || null,
    roundName: body.roundName, type: body.type,
    date: new Date(body.date), startTime: body.startTime, endTime: body.endTime, timezone: body.timezone || 'Asia/Kolkata',
    mode: body.mode, meetingProvider: body.meetingProvider || null, meetingUrl: body.meetingUrl || null, location: body.location || null,
    candidateInstructions: body.candidateInstructions || null, internalNotes: body.internalNotes || null,
    scorecardTemplateId: body.scorecardTemplateId || null,
    status: INTERVIEW_STATUS.SCHEDULED,
    scheduledBy: session.userId, scheduledByName: actorName, scheduledAt: new Date(),
  })

  const employees = await Employee.find({ _id: { $in: employeeIds }, tenantId }).select('firstName lastName')
  const employeeById = new Map(employees.map((e) => [String(e._id), e]))
  await InterviewPanelMember.insertMany(body.interviewers.map((p) => ({
    tenantId, interviewId: interview._id, employeeId: p.employeeId,
    employeeName: employeeById.get(String(p.employeeId)) ? `${employeeById.get(String(p.employeeId)).firstName} ${employeeById.get(String(p.employeeId)).lastName}` : null,
    role: p.role === PANEL_ROLE.PRIMARY ? PANEL_ROLE.PRIMARY : PANEL_ROLE.PANELIST,
  })))

  await InterviewScheduleHistory.create({
    tenantId, interviewId: interview._id, action: SCHEDULE_HISTORY_ACTION.SCHEDULED,
    newDate: interview.date, newStartTime: interview.startTime, newEndTime: interview.endTime,
    changedBy: session.userId, changedByName: actorName, changedAt: new Date(),
  })

  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.UPDATED,
    message: `Interview scheduled: ${body.roundName} on ${new Date(body.date).toDateString()} at ${body.startTime}`,
    actorName,
  })
  await application.save()

  await logAction(session, { action: 'INTERVIEW_SCHEDULED', entityType: 'Interview', entityId: interview._id, description: `Scheduled ${body.roundName} for application ${application.applicationCode}`, req })

  return ok({ interview, availability, conflictCount }, conflictCount > 0 ? `Interview scheduled — ${conflictCount} interviewer(s) have scheduling conflicts` : 'Interview scheduled', 201)
})
