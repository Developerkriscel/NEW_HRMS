export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { generateJobContentWithAi } from '@/lib/aiService'

const SECTION_ALIASES = new Map([
  ['description', 'description'],
  ['responsibilities', 'responsibilities'],
  ['requiredskills', 'requiredSkills'],
  ['preferredskills', 'preferredSkills'],
  ['experience', 'experience'],
  ['education', 'education'],
])

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()
  const requestedSection = String(body.section || '').trim().toLowerCase()
  const section = SECTION_ALIASES.get(requestedSection)

  if (!section) {
    return fail('Choose a valid job content field', 400, 'INVALID_SECTION')
  }

  const text = await generateJobContentWithAi({
    section,
    currentText: typeof body.currentText === 'string' ? body.currentText.slice(0, 6000) : '',
    jobData: {
      title: String(body.title || '').slice(0, 200),
      department: String(body.department || '').slice(0, 200),
      jobType: String(body.jobType || '').slice(0, 100),
      employmentType: String(body.employmentType || '').slice(0, 100),
      workMode: String(body.workMode || '').slice(0, 100),
      location: String(body.location || '').slice(0, 200),
      experience: String(body.experience || '').slice(0, 200),
      requiredSkills: String(body.requiredSkills || '').slice(0, 1000),
      preferredSkills: String(body.preferredSkills || '').slice(0, 1000),
      education: String(body.education || '').slice(0, 300),
    },
  }, tenantId)

  if (!text) return fail('Unable to create job content', 500, 'AI_CONTENT_EMPTY')

  return ok({ section, text }, 'Job content generated')
})
