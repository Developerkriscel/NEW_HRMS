export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { INTERVIEW_VIEW_ROLES, INTERVIEW_MANAGE_ROLES } from '@/lib/interviewConstants'
import { ensureDefaultScorecardTemplates } from '@/lib/interviewHelpers'
import InterviewScorecardTemplate from '@/models/InterviewScorecardTemplate'
import InterviewScorecardCriterion from '@/models/InterviewScorecardCriterion'

// GET — item 12's reusable templates. Auto-seeds the 6 starter templates
// (Technical Developer, Managerial, Sales, HR, Culture/Behavioral, Intern)
// the first time a tenant has none, rather than a separate seed step.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  await ensureDefaultScorecardTemplates(tenantId)

  const templates = await InterviewScorecardTemplate.find({ tenantId, deleted: false }).sort({ name: 1 }).lean()
  const criteria = await InterviewScorecardCriterion.find({ tenantId, templateId: { $in: templates.map((t) => t._id) } }).sort({ order: 1 }).lean()
  const criteriaByTemplate = new Map()
  for (const c of criteria) {
    const key = String(c.templateId)
    if (!criteriaByTemplate.has(key)) criteriaByTemplate.set(key, [])
    criteriaByTemplate.get(key).push(c)
  }

  return ok(templates.map((t) => ({ ...t, criteria: criteriaByTemplate.get(String(t._id)) || [] })))
})

// POST { name, category, criteria: [{name, maxScore}] } — a custom template.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.name?.trim()) return fail('Template name is required', 400, 'VALIDATION_ERROR')

  const template = await InterviewScorecardTemplate.create({
    tenantId, name: body.name.trim(), category: body.category || 'CUSTOM', description: body.description || null, createdByName: session.sub,
  })
  const criteria = (body.criteria || []).filter((c) => c.name?.trim())
  if (criteria.length) {
    await InterviewScorecardCriterion.insertMany(
      criteria.map((c, i) => ({ tenantId, templateId: template._id, name: c.name.trim(), maxScore: c.maxScore || 10, order: i }))
    )
  }

  return ok(template, 'Scorecard template created', 201)
})
