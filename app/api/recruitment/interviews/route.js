export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  INTERVIEW_VIEW_ROLES, INTERVIEW_MANAGE_ROLES, INTERVIEW_STATUS, PANEL_ROLE, SCHEDULE_HISTORY_ACTION,
} from '@/lib/interviewConstants'
import { ACTIVITY_ENTRY_TYPE, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import { checkAvailability } from '@/lib/interviewHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import { assertTenantMailReady } from '@/lib/tenantMail'
import { buildInterviewEmailDraft, sendInterviewInviteEmail } from '@/lib/interviewEmailDelivery'
import { createNotification } from '@/lib/notifications'
import { withOptionalMongoTransaction } from '@/lib/mongoTransaction'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'
import mongoose from 'mongoose'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import InterviewScheduleHistory from '@/models/InterviewScheduleHistory'
import Application from '@/models/Application'
import Employee from '@/models/Employee'
import JobPipelineStage from '@/models/JobPipelineStage'
import '@/models/Candidate'
import '@/models/Job'

// GET list with Interview page tabs computed server-side from the `tab` query param.
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

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setUTCHours(23, 59, 59, 999)

  if (tab === 'upcoming') {
    query.status = { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] }
    query.date = { $gte: todayStart }
  } else if (tab === 'today') {
    query.date = { $gte: todayStart, $lte: todayEnd }
    query.status = { $nin: ['CANCELLED'] }
  } else if (tab === 'completed') {
    query.status = INTERVIEW_STATUS.COMPLETED
  } else if (tab === 'feedbackPending') {
    query.status = INTERVIEW_STATUS.FEEDBACK_PENDING
  } else if (tab === 'cancelled') {
    query.status = { $in: ['CANCELLED', 'NO_SHOW'] }
  }

  if (dateFrom || dateTo) {
    query.date = query.date || {}
    if (dateFrom) query.date.$gte = new Date(dateFrom)
    if (dateTo) query.date.$lte = new Date(dateTo)
  }

  if (interviewer) {
    const panelRows = await InterviewPanelMember.find({ tenantId, employeeId: interviewer }).select('interviewId')
    query._id = { $in: panelRows.map((p) => p.interviewId) }
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
    _id: i._id,
    roundName: i.roundName,
    type: i.type,
    date: i.date,
    startTime: i.startTime,
    endTime: i.endTime,
    timezone: i.timezone,
    mode: i.mode,
    meetingProvider: i.meetingProvider,
    status: i.status,
    candidateId: i.candidateId?._id,
    candidateName: i.candidateId ? `${i.candidateId.firstName} ${i.candidateId.lastName}` : null,
    jobId: i.jobId?._id,
    jobTitle: i.jobId?.publicTitle || i.jobId?.jobTitle,
    panel: (panelByInterview.get(String(i._id)) || []).map((p) => ({
      employeeId: p.employeeId,
      name: p.employeeName,
      role: p.role,
      assignmentStatus: p.assignmentStatus,
      interviewDecision: p.interviewDecision || 'PENDING',
      decisionComment: p.decisionComment || null,
      decisionAt: p.decisionAt || null,
      feedbackStatus: p.feedbackStatus,
    })),
    applicationId: i.applicationId,
  }))

  return ok(paged(rows, page, size, totalElements))
})

// Schedule Interview. Availability conflicts warn HR but do not block scheduling.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const required = ['applicationId', 'roundName', 'type', 'date', 'startTime', 'endTime', 'mode']
  for (const field of required) {
    if (!body[field]) return fail(`${field} is required`, 400, 'VALIDATION_ERROR')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) || Number.isNaN(new Date(`${body.date}T00:00:00Z`).getTime())) {
    return fail('Interview date must be a valid calendar date (YYYY-MM-DD)', 400, 'VALIDATION_ERROR')
  }
  if (new Date(`${body.date}T00:00:00Z`).toISOString().slice(0, 10) !== body.date) {
    return fail('Interview date must be a valid calendar date (YYYY-MM-DD)', 400, 'VALIDATION_ERROR')
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.startTime)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.endTime))) {
    return fail('Interview start and end times must use HH:mm format', 400, 'VALIDATION_ERROR')
  }
  const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
  if (toMinutes(body.endTime) <= toMinutes(body.startTime)) {
    return fail('Interview end time must be later than the start time', 400, 'VALIDATION_ERROR')
  }
  const interviewTimezone = body.timezone || 'Asia/Kolkata'
  let localToday
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: interviewTimezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    localToday = `${values.year}-${values.month}-${values.day}`
  } catch {
    return fail('Interview timezone is invalid', 400, 'VALIDATION_ERROR')
  }
  if (body.date < localToday) return fail('Interview date cannot be in the past', 400, 'VALIDATION_ERROR')
  if (body.mode === 'ONLINE' && body.meetingUrl && !/^https?:\/\//i.test(String(body.meetingUrl))) {
    return fail('Meeting link must be a valid http or https URL', 400, 'VALIDATION_ERROR')
  }
  const requestedInterviewers = Array.isArray(body.interviewers) ? body.interviewers : []
  const uniqueInterviewerIds = [...new Set(requestedInterviewers.map((item) => String(item.employeeId || '')).filter(Boolean))]
  if (!uniqueInterviewerIds.length) return fail('Select at least one interviewer before scheduling the interview.', 400, 'VALIDATION_ERROR')
  if (uniqueInterviewerIds.some((id) => !mongoose.isValidObjectId(id))) return fail('One or more selected interviewers are invalid.', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: body.applicationId, tenantId, deleted: false }).populate('candidateId').populate('jobId')
  if (!application) return fail('Application not found', 404, 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN].includes(application.status)) {
    return fail(`Cannot schedule an interview for a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  const shouldSendCandidateEmail = body.sendCandidateEmail !== false
  if (shouldSendCandidateEmail && !application.candidateId?.email && !body.candidateEmail) {
    return fail('Candidate email is missing. Add candidate email before sending interview invite.', 400, 'VALIDATION_ERROR')
  }

  const employeeIds = uniqueInterviewerIds
  const employees = await Employee.find({ _id: { $in: employeeIds }, tenantId, status: 'ACTIVE' }).select('firstName lastName email role').lean()
  if (employees.length !== employeeIds.length) return fail('One or more selected interviewers are no longer active.', 400, 'VALIDATION_ERROR')
  const availability = employeeIds.length ? await checkAvailability(tenantId, employeeIds, body.date, body.startTime, body.endTime) : {}
  const conflictCount = Object.values(availability).filter((a) => !a.available).length

  const actorName = await getActorName(session)
  const jobId = application.jobId._id || application.jobId
  const isEarlyStage = !application.currentStage || application.currentStageName === 'Applied' || /screen|shortlist/i.test(application.currentStageName || '')
  let interviewStage = null
  if (isEarlyStage) {
    const stages = await JobPipelineStage.find({ tenantId, jobId, isActive: true }).sort({ order: 1 })
    const roundStage = stages.find((stage) => stage.name?.toLowerCase() === body.roundName?.toLowerCase())
    interviewStage = (roundStage?.category === PIPELINE_STAGE_CATEGORY.INTERVIEW ? roundStage : null)
      || stages.find((stage) => stage.category === PIPELINE_STAGE_CATEGORY.INTERVIEW)
      || roundStage
      || stages.find((stage) => /interview|round/i.test(stage.name || ''))
      || null
  }

  const employeeById = new Map(employees.map((employee) => [String(employee._id), employee]))
  const applicationBefore = {
    currentStage: application.currentStage,
    currentStageName: application.currentStageName,
    stageEnteredAt: application.stageEnteredAt,
    selectionStatus: application.selectionStatus,
    activityLog: application.activityLog.map((entry) => entry.toObject ? entry.toObject() : { ...entry }),
  }
  let interview = null
  let panelMembers = []
  let stageHistoryId = null

  try {
    await withOptionalMongoTransaction(async (dbSession) => {
      const sessionOptions = dbSession ? { session: dbSession } : undefined
      ;[interview] = await Interview.create([{
        tenantId,
        applicationId: application._id,
        candidateId: application.candidateId._id || application.candidateId,
        jobId,
        pipelineStageId: interviewStage?._id || application.currentStage || null,
        roundName: body.roundName,
        type: body.type,
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        timezone: interviewTimezone,
        mode: body.mode,
        meetingProvider: body.meetingProvider || null,
        meetingUrl: body.meetingUrl || null,
        location: body.location || null,
        candidateInstructions: body.candidateInstructions || body.candidateEmailBody || null,
        internalNotes: body.internalNotes || null,
        scorecardTemplateId: body.scorecardTemplateId || null,
        status: INTERVIEW_STATUS.SCHEDULED,
        scheduledBy: session.userId,
        scheduledByName: actorName,
        scheduledAt: new Date(),
      }], sessionOptions)

      panelMembers = await InterviewPanelMember.insertMany(employeeIds.map((employeeId, index) => ({
        tenantId,
        interviewId: interview._id,
        employeeId,
        employeeName: `${employeeById.get(String(employeeId)).firstName} ${employeeById.get(String(employeeId)).lastName}`.trim(),
        role: requestedInterviewers.find((item) => String(item.employeeId) === String(employeeId))?.role === PANEL_ROLE.PRIMARY || index === 0 ? PANEL_ROLE.PRIMARY : PANEL_ROLE.PANELIST,
        assignmentStatus: 'PENDING',
        notifiedAt: null,
      })), sessionOptions)

      if (interviewStage) {
        const { fromStageId, fromStageName } = applyStageMove(application, interviewStage, { comment: `Interview scheduled: ${body.roundName}`, actorName })
        const history = await recordStageHistory({
          tenantId,
          application,
          fromStageId,
          toStageId: interviewStage._id,
          fromStageName,
          toStageName: interviewStage.name,
          action: STAGE_HISTORY_ACTION.MOVED,
          comment: `Interview scheduled: ${body.roundName}`,
          session,
          dbSession,
        })
        stageHistoryId = history?._id || null
      }

      application.activityLog.push({
        type: ACTIVITY_ENTRY_TYPE.UPDATED,
        message: `Interview scheduled: ${body.roundName} on ${new Date(body.date).toDateString()} at ${body.startTime}`,
        actorName,
      })
      await application.save(sessionOptions)

      await InterviewScheduleHistory.create([{
        tenantId,
        interviewId: interview._id,
        action: SCHEDULE_HISTORY_ACTION.SCHEDULED,
        newDate: interview.date,
        newStartTime: interview.startTime,
        newEndTime: interview.endTime,
        changedBy: session.userId,
        changedByName: actorName,
        changedAt: new Date(),
      }], sessionOptions)
    })
  } catch (error) {
    if (interview?._id) {
      await Promise.all([
        Interview.deleteOne({ _id: interview._id, tenantId }).catch(() => {}),
        InterviewPanelMember.deleteMany({ interviewId: interview._id, tenantId }).catch(() => {}),
        InterviewScheduleHistory.deleteMany({ interviewId: interview._id, tenantId }).catch(() => {}),
        ...(stageHistoryId ? [ApplicationStageHistory.deleteOne({ _id: stageHistoryId, tenantId }).catch(() => {})] : []),
      ])
      application.currentStage = applicationBefore.currentStage
      application.currentStageName = applicationBefore.currentStageName
      application.stageEnteredAt = applicationBefore.stageEnteredAt
      application.selectionStatus = applicationBefore.selectionStatus
      application.activityLog = applicationBefore.activityLog
      await application.save().catch(() => {})
    }
    throw error
  }

  // External email and notification services run after the scheduling records
  // commit. Their failure is reported or ignored without leaving half a schedule.
  if (body.candidateEmail && application.candidateId && application.candidateId.email !== body.candidateEmail) {
    application.candidateId.email = body.candidateEmail
    await application.candidateId.save().catch((error) => console.warn('Could not save candidate email update:', error.message))
  }

  if (shouldSendCandidateEmail) {
    const draft = buildInterviewEmailDraft({ candidate: application.candidateId, job: application.jobId, interview, body })
    interview.candidateInviteSubject = draft.subject
    interview.candidateInstructions = draft.body
    try {
      await assertTenantMailReady(tenantId)
      await sendInterviewInviteEmail({
        tenantId,
        candidate: application.candidateId,
        job: application.jobId,
        interview,
        body: { ...body, candidateEmailSubject: draft.subject, candidateEmailBody: draft.body },
      })
      interview.candidateInviteStatus = 'SENT'
      interview.candidateInviteSentAt = new Date()
      interview.candidateInviteError = null
    } catch (error) {
      interview.candidateInviteStatus = 'FAILED'
      interview.candidateInviteError = error.message || 'Interview invite email failed'
    }
    await interview.save().catch((error) => console.warn('Could not save interview invite delivery status:', error.message))
  }

  const notificationResults = await Promise.all(panelMembers.map(async (member) => {
    const notification = await createNotification({
      userId: member.employeeId,
      // Target this employee directly; a legacy role enum must not block delivery.
      targetRole: 'ALL',
      tenant: tenantId,
      title: 'Interview assignment requires your response',
      message: `Please confirm availability for ${body.roundName}: ${application.candidateId.firstName || ''} ${application.candidateId.lastName || ''} — ${application.jobId.publicTitle || application.jobId.jobTitle || 'an open position'}, ${body.date}, ${body.startTime}–${body.endTime} (${interviewTimezone}). Accept if you can attend; reject if unavailable.`,
      type: 'warning',
      category: 'interview',
      link: '/notifications',
      metadata: { kind: 'INTERVIEW_ASSIGNMENT', decision: 'PENDING', interviewId: String(interview._id), panelMemberId: String(member._id) },
    })
    if (!notification) return false
    member.notifiedAt = new Date()
    await member.save().catch((error) => console.warn('Could not save interviewer notification timestamp:', error.message))
    return true
  }))
  const notificationFailureCount = notificationResults.filter((sent) => !sent).length

  await logAction(session, { action: 'INTERVIEW_SCHEDULED', entityType: 'Interview', entityId: interview._id, description: `Scheduled ${body.roundName} for application ${application.applicationCode}`, req })

  const emailWarning = interview.candidateInviteStatus === 'FAILED'
    ? ` Interview invite email was not sent: ${interview.candidateInviteError || 'mail service is not available'}.`
    : ''
  const notificationWarning = notificationFailureCount
    ? ` In-app notification could not be delivered to ${notificationFailureCount} interviewer(s). Please retry or contact an administrator.`
    : ''
  const message = conflictCount > 0
    ? `Interview scheduled - ${conflictCount} interviewer(s) have scheduling conflicts`
    : 'Interview scheduled'

  return ok({
    interview,
    availability,
    conflictCount,
    emailWarning: emailWarning.trim() || null,
    notificationWarning: notificationWarning.trim() || null,
  }, `${message}${emailWarning}${notificationWarning}`, 201)
})
