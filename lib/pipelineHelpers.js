// Step 8 — shared pipeline/stage-movement logic used by the direct
// move-stage route, bulk-move, and the Shortlist screening decision, so
// there is exactly one place that (a) validates a move and (b) writes
// application_stage_history — "never just overwrite currentStage without
// keeping history."
import { STAGE_HISTORY_ACTION } from './pipelineConstants'
import { STAGE_SLA_DAYS, STAGE_CATEGORY_UNLOCKS, PIPELINE_STAGE_CATEGORY } from './jobConstants'
import { ACTIVITY_ENTRY_TYPE } from './candidateConstants'
import { SELECTION_STATUS } from './selectionConstants'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'
import JobPipelineStage from '@/models/JobPipelineStage'

export async function recordStageHistory({ tenantId, application, fromStageId, toStageId, fromStageName, toStageName, action, comment, session }) {
  await ApplicationStageHistory.create({
    tenantId,
    applicationId: application._id,
    fromStageId: fromStageId || null,
    toStageId: toStageId || null,
    fromStageName: fromStageName || null,
    toStageName: toStageName || null,
    action,
    comment: comment || null,
    movedBy: session?.userId || null,
    movedByName: session?.sub || null,
  })
}

// Moves an application to a specific, already-validated stage document.
// Resets stageEnteredAt (drives aging) and appends both the activity log
// entry and the durable history row. Does not save() — caller controls
// when to persist (some callers batch other field changes in first).
export function applyStageMove(application, stage, { comment, actorName } = {}) {
  const fromStageName = application.currentStageName
  const fromStageId = application.currentStage
  application.currentStage = stage._id
  application.currentStageName = stage.name
  application.stageEnteredAt = new Date()
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STAGE_CHANGED,
    message: `Moved from ${fromStageName} to ${stage.name}${actorName ? ` by ${actorName}` : ''}`,
    comment: comment || undefined,
    actorName,
  })

  // Step 11 — the single choke-point every stage-moving route goes through,
  // so this is the one place we need to detect "application just reached
  // the final selection stage." Only set it the first time in — a decision
  // (select/hold/reject/additional round) is what changes it after that, we
  // must never clobber a real decision just because the stage was re-entered.
  if (stage.category === PIPELINE_STAGE_CATEGORY.SELECTED && !application.selectionStatus) {
    application.selectionStatus = SELECTION_STATUS.PENDING_DECISION
  }

  return { fromStageId, fromStageName }
}

// Finds the job's "Shortlisted" stage by name if one exists (matches the
// DEFAULT_HIRING/INTERN_HIRING templates from Step 3); otherwise falls back
// to the next stage in pipeline order after the application's current
// stage, so a custom pipeline without a literally-named "Shortlisted" stage
// still advances sensibly instead of erroring out.
export function findShortlistStage(stages, currentStage) {
  const named = stages.find((s) => s.isActive && /shortlist/i.test(s.name))
  if (named) return named

  const sorted = stages.filter((s) => s.isActive).sort((a, b) => a.order - b.order)
  const currentIndex = sorted.findIndex((s) => String(s._id) === String(currentStage?._id || currentStage))
  if (currentIndex >= 0 && currentIndex + 1 < sorted.length) return sorted[currentIndex + 1]
  return null
}

export function computeStageAgeDays(application) {
  const entered = application.stageEnteredAt || application.appliedAt
  if (!entered) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(entered).getTime()) / 86400000))
}

export function getStageSla(category) {
  return STAGE_SLA_DAYS[category] ?? null
}

export function computeStageAging(application, stageCategory) {
  const ageDays = computeStageAgeDays(application)
  const slaDays = getStageSla(stageCategory)
  const overdueDays = slaDays != null ? Math.max(0, ageDays - slaDays) : 0
  return { ageDays, slaDays, isOverdue: overdueDays > 0, overdueDays }
}

export function getStageUnlock(category) {
  return STAGE_CATEGORY_UNLOCKS[category] || null
}

export async function getJobStagesMap(tenantId, jobIds) {
  const stages = await JobPipelineStage.find({ tenantId, jobId: { $in: jobIds } }).sort({ order: 1 }).lean()
  const byJob = new Map()
  for (const s of stages) {
    const key = String(s.jobId)
    if (!byJob.has(key)) byJob.set(key, [])
    byJob.get(key).push(s)
  }
  return byJob
}
