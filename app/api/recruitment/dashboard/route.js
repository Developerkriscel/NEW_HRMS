export const dynamic = 'force-dynamic'

import mongoose from 'mongoose'
import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Job from '@/models/Job'
import Candidate from '@/models/Candidate'
import Application from '@/models/Application'
import Interview from '@/models/Interview'
import Offer from '@/models/Offer'
import Preboarding from '@/models/Preboarding'
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_STATUS,
} from '@/lib/candidateConstants'
import {
  JOB_STATUS,
  PIPELINE_STAGE_CATEGORY,
  PIPELINE_STAGE_CATEGORY_LABELS,
} from '@/lib/jobConstants'
import {
  INTERVIEW_ACTIVE_STATUSES,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_STATUS,
  INTERVIEW_TYPE_LABELS,
} from '@/lib/interviewConstants'
import { OFFER_STATUS, OFFER_STATUS_LABELS } from '@/lib/offerConstants'
import { PREBOARDING_STATUS, PREBOARDING_STATUS_LABELS } from '@/lib/preboardingConstants'

const RECRUITMENT_DASHBOARD_ROLES = ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN']
const STAGE_ORDER = [
  PIPELINE_STAGE_CATEGORY.APPLIED,
  PIPELINE_STAGE_CATEGORY.SCREENING,
  PIPELINE_STAGE_CATEGORY.ASSESSMENT,
  PIPELINE_STAGE_CATEGORY.INTERVIEW,
  PIPELINE_STAGE_CATEGORY.SELECTED,
  PIPELINE_STAGE_CATEGORY.OFFER,
  PIPELINE_STAGE_CATEGORY.HIRED,
  PIPELINE_STAGE_CATEGORY.REJECTED,
]
const TERMINAL_PREBOARDING_STATUSES = [
  PREBOARDING_STATUS.JOINED,
  PREBOARDING_STATUS.NO_SHOW,
  PREBOARDING_STATUS.CANCELLED,
]
const ACTIVE_OFFER_STATUSES = [
  OFFER_STATUS.SENT,
  OFFER_STATUS.VIEWED,
  OFFER_STATUS.APPROVED,
]

function castTenantId(tenantId) {
  return mongoose.Types.ObjectId.isValid(String(tenantId))
    ? new mongoose.Types.ObjectId(tenantId)
    : tenantId
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDate(date) {
  if (!date) return null
  return new Date(date).toISOString().slice(0, 10)
}

function formatTime(time) {
  if (!time) return '-'
  const [rawHour, rawMinute = '00'] = String(time).split(':')
  const hour = Number(rawHour)
  if (Number.isNaN(hour)) return time
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${rawMinute.padStart(2, '0')} ${suffix}`
}

function fullName(candidate) {
  const name = [candidate?.firstName, candidate?.lastName].filter(Boolean).join(' ').trim()
  return name || candidate?.email || 'Candidate'
}

function daysOpen(job, now = new Date()) {
  const openedAt = new Date(job.openingDate || job.createdAt || now)
  const diff = now.getTime() - openedAt.getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

function buildFunnel(applications) {
  const counts = new Map(STAGE_ORDER.map((stage) => [stage, 0]))
  let withdrawn = 0
  let onHold = 0

  for (const application of applications) {
    if (application.status === APPLICATION_STATUS.HIRED) {
      counts.set(PIPELINE_STAGE_CATEGORY.HIRED, counts.get(PIPELINE_STAGE_CATEGORY.HIRED) + 1)
      continue
    }
    if (application.status === APPLICATION_STATUS.REJECTED) {
      counts.set(PIPELINE_STAGE_CATEGORY.REJECTED, counts.get(PIPELINE_STAGE_CATEGORY.REJECTED) + 1)
      continue
    }
    if (application.status === APPLICATION_STATUS.WITHDRAWN) {
      withdrawn += 1
      continue
    }
    if (application.status === APPLICATION_STATUS.ON_HOLD) {
      onHold += 1
    }

    const category = application.stage?.category || PIPELINE_STAGE_CATEGORY.APPLIED
    if (counts.has(category)) counts.set(category, counts.get(category) + 1)
    else counts.set(PIPELINE_STAGE_CATEGORY.APPLIED, counts.get(PIPELINE_STAGE_CATEGORY.APPLIED) + 1)
  }

  const funnel = STAGE_ORDER.map((stage) => ({
    stage: PIPELINE_STAGE_CATEGORY_LABELS[stage] || stage,
    count: counts.get(stage) || 0,
  }))
  if (onHold > 0) funnel.push({ stage: 'On Hold', count: onHold })
  if (withdrawn > 0) funnel.push({ stage: 'Withdrawn', count: withdrawn })
  return funnel
}

function buildSourcePerformance(sourceRows) {
  return sourceRows
    .map((row) => ({
      source: APPLICATION_SOURCE_LABELS[row._id] || row._id || 'Unknown',
      candidates: row.candidates || 0,
      hires: row.hires || 0,
    }))
    .sort((a, b) => b.candidates - a.candidates || b.hires - a.hires)
}

function buildOfferStatus(offerRows) {
  const counts = new Map(offerRows.map((row) => [row._id, row.count]))
  return Object.values(OFFER_STATUS)
    .map((status) => ({ status: OFFER_STATUS_LABELS[status] || status, count: counts.get(status) || 0 }))
    .filter((row) => row.count > 0)
}

function pendingAction(id, label, count, link) {
  return { id, label: `${count} ${label}`, count, link }
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, RECRUITMENT_DASHBOARD_ROLES)
  const tenantId = requireTenantId(session)
  const tenantObjectId = castTenantId(tenantId)

  const today = startOfDay()
  const tomorrow = addDays(today, 1)
  const dayAfterTomorrow = addDays(today, 2)
  const nextSevenDays = addDays(today, 7)
  const nextFourteenDays = addDays(today, 14)
  const lastThirtyDays = addDays(today, -30)
  const baseQuery = { tenantId, deleted: false }
  const baseMatch = { tenantId: tenantObjectId, deleted: false }

  const [
    openPositions,
    totalCandidates,
    newApplications,
    interviewsScheduled,
    pendingOffers,
    joiningSoonCount,
    applicationsForFunnel,
    todayInterviews,
    openJobs,
    sourceRows,
    offerRows,
    joiningProfiles,
    feedbackPending,
    offersNeedApproval,
    offersExpiringSoon,
    onboardingDocsPending,
    joiningTomorrow,
  ] = await Promise.all([
    Job.countDocuments({ ...baseQuery, status: JOB_STATUS.OPEN }),
    Candidate.countDocuments(baseQuery),
    Application.countDocuments({ ...baseQuery, appliedAt: { $gte: lastThirtyDays } }),
    Interview.countDocuments({
      ...baseQuery,
      date: { $gte: today },
      status: { $in: INTERVIEW_ACTIVE_STATUSES },
    }),
    Offer.countDocuments({
      ...baseQuery,
      status: { $in: [OFFER_STATUS.DRAFT, OFFER_STATUS.PENDING_APPROVAL, OFFER_STATUS.APPROVED, OFFER_STATUS.REVISION_REQUESTED] },
    }),
    Preboarding.countDocuments({
      ...baseQuery,
      status: { $nin: TERMINAL_PREBOARDING_STATUSES },
      proposedJoiningDate: { $gte: today, $lte: nextFourteenDays },
    }),
    Application.aggregate([
      { $match: baseMatch },
      {
        $lookup: {
          from: 'job_pipeline_stages',
          localField: 'currentStage',
          foreignField: '_id',
          as: 'stage',
        },
      },
      { $unwind: { path: '$stage', preserveNullAndEmptyArrays: true } },
      { $project: { status: 1, currentStageName: 1, stage: { category: '$stage.category' } } },
    ]),
    Interview.find({
      ...baseQuery,
      date: { $gte: today, $lt: tomorrow },
      status: { $nin: [INTERVIEW_STATUS.CANCELLED, INTERVIEW_STATUS.NO_SHOW] },
    })
      .populate('candidateId', 'firstName lastName email')
      .populate('jobId', 'jobTitle')
      .sort({ startTime: 1 })
      .limit(10)
      .lean(),
    Job.find({ ...baseQuery, status: { $in: [JOB_STATUS.OPEN, JOB_STATUS.PAUSED] } })
      .select('jobTitle openingDate createdAt status')
      .sort({ openingDate: 1, createdAt: 1 })
      .limit(20)
      .lean(),
    Application.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$source',
          candidates: { $sum: 1 },
          hires: { $sum: { $cond: [{ $eq: ['$status', APPLICATION_STATUS.HIRED] }, 1, 0] } },
        },
      },
    ]),
    Offer.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Preboarding.find({
      ...baseQuery,
      status: { $nin: TERMINAL_PREBOARDING_STATUSES },
      proposedJoiningDate: { $gte: today, $lte: nextFourteenDays },
    })
      .populate('candidateId', 'firstName lastName email')
      .populate('jobId', 'jobTitle')
      .sort({ proposedJoiningDate: 1 })
      .limit(8)
      .lean(),
    Interview.countDocuments({ ...baseQuery, status: INTERVIEW_STATUS.FEEDBACK_PENDING }),
    Offer.countDocuments({ ...baseQuery, status: OFFER_STATUS.PENDING_APPROVAL }),
    Offer.countDocuments({
      ...baseQuery,
      status: { $in: ACTIVE_OFFER_STATUSES },
      expiresAt: { $gte: today, $lte: nextSevenDays },
    }),
    Preboarding.countDocuments({
      ...baseQuery,
      status: { $in: [PREBOARDING_STATUS.DOCUMENTS_PENDING, PREBOARDING_STATUS.VERIFICATION_PENDING] },
    }),
    Preboarding.countDocuments({
      ...baseQuery,
      status: { $nin: TERMINAL_PREBOARDING_STATUSES },
      proposedJoiningDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
    }),
  ])

  const needsScreening = applicationsForFunnel.filter((application) => {
    if (application.status !== APPLICATION_STATUS.ACTIVE) return false
    const category = application.stage?.category || PIPELINE_STAGE_CATEGORY.APPLIED
    return [PIPELINE_STAGE_CATEGORY.APPLIED, PIPELINE_STAGE_CATEGORY.SCREENING].includes(category)
  }).length

  const positionAging = openJobs
    .map((job) => ({ position: job.jobTitle || 'Untitled Position', days: daysOpen(job) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)

  return ok({
    stats: {
      openPositions,
      totalCandidates,
      newApplications,
      interviewsScheduled,
      pendingOffers,
      joiningSoon: joiningSoonCount,
    },

    funnel: buildFunnel(applicationsForFunnel),

    todayInterviews: todayInterviews.map((interview) => ({
      id: String(interview._id),
      time: formatTime(interview.startTime),
      candidate: fullName(interview.candidateId),
      position: interview.jobId?.jobTitle || 'Position',
      round: interview.roundName || INTERVIEW_TYPE_LABELS[interview.type] || 'Interview',
      interviewer: interview.scheduledByName || 'Not assigned',
      mode: INTERVIEW_MODE_LABELS[interview.mode] || interview.mode || '-',
    })),

    pendingActions: [
      pendingAction('screening', 'candidates need screening', needsScreening, '/hr/recruitment/candidates?filter=screening'),
      pendingAction('feedback', 'interview feedbacks pending', feedbackPending, '/hr/recruitment/interviews?filter=feedback-pending'),
      pendingAction('offer-approval', 'offers need approval', offersNeedApproval, '/hr/recruitment/offers?filter=pending-approval'),
      pendingAction('offer-expiry', 'offers expire soon', offersExpiringSoon, '/hr/recruitment/offers?filter=expiring'),
      pendingAction('onboarding-docs', 'onboarding documents pending', onboardingDocsPending, '/hr/onboarding?filter=documents-pending'),
      pendingAction('joining-tomorrow', 'candidates joining tomorrow', joiningTomorrow, '/hr/onboarding?filter=joining-tomorrow'),
    ],

    positionAging,

    sourcePerformance: buildSourcePerformance(sourceRows),

    joiningSoon: joiningProfiles.map((profile) => ({
      id: String(profile._id),
      name: fullName(profile.candidateId),
      position: profile.jobId?.jobTitle || 'Position',
      joiningDate: formatDate(profile.confirmedJoiningDate || profile.proposedJoiningDate),
      status: PREBOARDING_STATUS_LABELS[profile.status] || profile.status,
    })),

    offerStatus: buildOfferStatus(offerRows),
  })
})
