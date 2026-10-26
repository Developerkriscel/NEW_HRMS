export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { generateJobContentWithAi } from '@/lib/aiService'

const SECTION_ALIASES = new Map([
  ['all', 'all'],
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

  const jobData = {
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
  }

  if (section === 'all' && !jobData.title.trim()) {
    return fail('Enter a job title before generating requirements', 400, 'JOB_TITLE_REQUIRED')
  }

  const sections = section === 'all'
    ? ['description', 'responsibilities', 'requiredSkills', 'preferredSkills', 'experience', 'education']
    : [section]
  const generated = await Promise.all(sections.map(async (requested) => {
    const currentText = typeof body.currentText?.[requested] === 'string'
      ? body.currentText[requested].slice(0, 6000)
      : typeof body.currentText === 'string' && requested === section
        ? body.currentText.slice(0, 6000)
        : ''
    const text = await generateJobContentWithAi({ section: requested, currentText, jobData }, tenantId)
    return [requested, text]
  }))
  const generatedFields = Object.fromEntries(generated)

  if (Object.values(generatedFields).some((text) => !text)) {
    return fail('Unable to generate all job requirements. Please try again.', 500, 'AI_CONTENT_EMPTY')
  }

  return section === 'all'
    ? ok({ sections: generatedFields }, 'Job requirements generated')
    : ok({ section, text: generatedFields[section] }, 'Job content generated')
})
