import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Job from '@/models/Job'
import JobSkill from '@/models/JobSkill'
import { evaluateCandidateMatchWithAi } from '@/lib/aiService'

function skillNames(rows, type) {
  return rows.filter((skill) => skill.type === type).map((skill) => skill.skillName).filter(Boolean)
}

function splitRequirementSkills(value) {
  return String(value || '')
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseYears(value) {
  if (value === null || value === undefined || value === '') return null
  const match = String(value).match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function candidateSkillNames(cand) {
  if (!Array.isArray(cand.skills)) return splitRequirementSkills(cand.skills)
  return cand.skills
    .map((skill) => typeof skill === 'string' ? skill : skill?.skillName)
    .map((skill) => String(skill || '').trim())
    .filter(Boolean)
}

function matchLabel(score) {
  return score >= 85 ? 'Strong Match' : score >= 70 ? 'Good Match' : score >= 50 ? 'Potential Match' : 'Low Match'
}

function buildFallbackAnalysis(cand, jobData, reason = 'AI was unavailable') {
  const requiredSkills = jobData.requiredSkills?.length
    ? jobData.requiredSkills
    : splitRequirementSkills(jobData.requiredQualifications)
  const preferredSkills = jobData.preferredSkills || []
  const skills = candidateSkillNames(cand)
  const candidateText = `${cand.role || ''} ${skills.join(' ')}`.toLowerCase()
  const jobTitle = String(jobData.title || jobData.jobTitle || '').toLowerCase()
  const candidateRole = String(cand.role || '').toLowerCase()
  const matchedRequired = requiredSkills.filter((skill) => candidateText.includes(String(skill).toLowerCase()))
  const missingRequired = requiredSkills.filter((skill) => !matchedRequired.includes(skill))
  const matchedPreferred = preferredSkills.filter((skill) => candidateText.includes(String(skill).toLowerCase()))
  const skillScore = requiredSkills.length
    ? Math.round((matchedRequired.length / requiredSkills.length) * 60)
    : Math.min(35, skills.length * 7)
  const roleScore = candidateRole && jobTitle && (jobTitle.includes(candidateRole) || candidateRole.includes(jobTitle)) ? 20 : 0
  const minExperience = parseYears(jobData.minExperience)
  const candidateExperience = parseYears(cand.totalExperience ?? cand.exp)
  const experienceScore = minExperience == null
    ? (candidateExperience == null ? 8 : 20)
    : candidateExperience == null
      ? 5
      : Math.max(0, Math.min(20, Math.round((candidateExperience / Math.max(minExperience, 1)) * 20)))
  const score = Math.max(0, Math.min(100, skillScore + roleScore + experienceScore))
  const strengths = [
    ...matchedRequired.slice(0, 4).map((skill) => `${skill} matched`),
    ...matchedPreferred.slice(0, 2).map((skill) => `${skill} preferred skill matched`),
  ]
  if (roleScore) strengths.push('Role/title aligns with job')
  if (candidateExperience != null && minExperience != null && candidateExperience >= minExperience) strengths.push(`${candidateExperience} years meets minimum experience`)
  const concerns = missingRequired.slice(0, 4).map((skill) => `${skill} not found`)
  if (candidateExperience == null) concerns.push('Experience years not clearly available')
  else if (minExperience != null && candidateExperience < minExperience) concerns.push(`Experience below requirement (${candidateExperience} vs ${minExperience}+ years)`)
  return {
    ...cand,
    score,
    matchLabel: matchLabel(score),
    analysisSummary: `${reason}, so this score was calculated using deterministic skill, role, and experience matching.`,
    matchedSkills: matchedRequired,
    missingSkills: missingRequired,
    strengths,
    concerns,
    analysisSource: 'FALLBACK',
  }
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  
  const body = await req.json()
  const { candidates, jobId, jobData: payloadJobData } = body

  if (!Array.isArray(candidates)) {
    return fail('Invalid candidates array', 400)
  }

  let jobData = payloadJobData || null
  let activeJobId = jobId
  if (activeJobId && !String(activeJobId).match(/^[0-9a-fA-F]{24}$/)) {
    activeJobId = null
  }

  if (activeJobId && !jobData) {
    const [position, jobSkills] = await Promise.all([
      Job.findOne({ _id: activeJobId, tenantId }).lean(),
      JobSkill.find({ jobId: activeJobId, tenantId }).lean(),
    ])
    if (position) {
      const requiredSkillNames = skillNames(jobSkills, 'REQUIRED')
      const preferredSkillNames = skillNames(jobSkills, 'PREFERRED')
      jobData = {
        title: position.jobTitle || position.title,
        description: position.jobSummary || position.description,
        responsibilities: position.responsibilities,
        requiredQualifications: position.requiredQualifications,
        preferredQualifications: position.preferredQualifications,
        minExperience: position.minExperience,
        requiredSkills: requiredSkillNames,
        preferredSkills: preferredSkillNames,
      }
    }
  }

  if (!jobData) {
    return fail('Valid Job Position is required for AI matching', 400)
  }

    // Process all candidates in parallel (or sequentially to avoid rate limits, let's do sequentially to be safe)
    const analyzedCandidates = []
    
    for (const cand of candidates) {
      const resumeParsedData = {
        personalInfo: {
          name: cand.name,
          email: cand.email,
          phone: cand.phone,
          location: cand.location
        },
        aiSummary: `Role: ${cand.role || 'Unknown'}. Experience: ${cand.exp || 'Unknown'}.`,
        skills: cand.skills || [],
        experience: cand.experience || [],
        education: cand.education || []
      }

      const candidateData = {
        firstName: cand.name?.split(' ')[0] || '',
        lastName: cand.name?.split(' ').slice(1).join(' ') || '',
        totalExperience: parseYears(cand.totalExperience ?? cand.exp) ?? '',
        currentDesignation: cand.role || ''
      }

      try {
        const aiMatch = await evaluateCandidateMatchWithAi(jobData, candidateData, resumeParsedData, tenantId)
        
        if (!aiMatch) {
          analyzedCandidates.push(buildFallbackAnalysis(cand, jobData))
        } else {
          const score = Math.max(0, Math.min(100, Math.round(Number(aiMatch.aiMatchScore) || 0)))
          analyzedCandidates.push({
            ...cand,
            score,
            matchLabel: matchLabel(score),
            analysisSummary: aiMatch.aiMatchReasoning || 'Analysis complete.',
            matchedSkills: aiMatch.strengths || [],
            missingSkills: aiMatch.concerns || [],
            strengths: aiMatch.strengths || [],
            concerns: aiMatch.concerns || [],
            aiMatchDetails: aiMatch,
            analysisSource: 'AI',
          })
        }
        
        // Wait 1.5 seconds between requests to avoid Mistral free tier rate limits (1 req/sec)
        await new Promise(resolve => setTimeout(resolve, 1500))
        
      } catch (err) {
        analyzedCandidates.push({
          ...buildFallbackAnalysis(cand, jobData, 'AI analysis failed'),
          analysisError: err.message || 'AI analysis failed',
        })
      }
    }

    analyzedCandidates.sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0)
      if (scoreDiff !== 0) return scoreDiff
      return (a.name || '').localeCompare(b.name || '')
    })

    return ok({ candidates: analyzedCandidates })
})
