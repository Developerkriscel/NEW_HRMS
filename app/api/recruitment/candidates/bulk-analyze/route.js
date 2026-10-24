import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Job from '@/models/Job'
import JobSkill from '@/models/JobSkill'
import { evaluateCandidateMatchWithAi } from '@/lib/aiService'

const TECH_DICTIONARY = [
  'javascript', 'typescript', 'node.js', 'nodejs', 'react', 'react.js', 'redux', 'angular', 'vue', 'next.js',
  'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'spring boot', 'c++', 'c#', '.net', 'golang', 'go',
  'html', 'html5', 'css', 'css3', 'tailwind', 'tailwind css', 'bootstrap', 'sass', 'scss',
  'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'nosql', 'sqlite', 'oracle',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'git', 'github', 'gitlab',
  'rest api', 'rest', 'rest apis', 'graphql', 'microservices', 'express', 'express.js',
  'agile', 'scrum', 'sales', 'marketing', 'digital marketing', 'seo', 'accounting', 'hubspot',
  'full stack', 'frontend', 'backend', 'web development', 'qa', 'testing', 'cypress', 'jest'
]

const STOP_WORDS = new Set([
  'etc', 'and', 'or', 'strong', 'knowledge', 'of', 'good', 'understanding',
  'experience', 'with', 'years', 'in', 'as', 'per', 'role', 'requirements',
  'the', 'to', 'for', 'a', 'an', 'is', 'are', 'candidate', 'will', 'must',
  'have', 'working', 'skills', 'responsibilities', 'qualifications', 'plus'
])

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

function cleanToken(s) {
  return norm(s).replace(/[^a-z0-9+#.]/g, '')
}

function skillNames(rows, type) {
  return rows.filter((skill) => skill.type === type).map((skill) => skill.skillName).filter(Boolean)
}

function parseYears(value) {
  if (value === null || value === undefined || value === '') return null
  const match = String(value).match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function candidateSkillNames(cand) {
  if (!cand) return []
  let raw = cand.skills || []
  if (typeof raw === 'string') {
    raw = raw.split(/[,;|\n/•]+/)
  }
  return raw
    .map((skill) => typeof skill === 'string' ? skill : skill?.skillName)
    .map((skill) => String(skill || '').trim())
    .filter(Boolean)
}

function matchLabel(score) {
  return score >= 85 ? 'Strong Match' : score >= 70 ? 'Good Match' : score >= 50 ? 'Potential Match' : 'Low Match'
}

// Extracts clean, deduplicated technology/skill names from any job text (qualifications, responsibilities, title)
function extractJobSkills(jobData) {
  const explicit = Array.isArray(jobData.requiredSkills) ? jobData.requiredSkills.filter(Boolean) : []
  const found = new Map() // lowercase -> display string

  // Add explicit skills first
  for (const s of explicit) {
    const key = cleanToken(s)
    if (key && !STOP_WORDS.has(key)) {
      found.set(key, s.trim())
    }
  }

  const combinedText = `${jobData.title || jobData.jobTitle || ''} ${jobData.requiredQualifications || ''} ${jobData.responsibilities || ''} ${jobData.description || jobData.jobSummary || ''}`

  // Check dictionary skills in job text
  for (const tech of TECH_DICTIONARY) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(?:^|[\\s,;()|/•-])${escaped}(?:[\\s,;()|/•-]|$)`, 'i')
    if (regex.test(combinedText)) {
      const key = cleanToken(tech)
      if (!found.has(key)) {
        found.set(key, tech.toUpperCase() === tech ? tech : tech.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('.'))
      }
    }
  }

  // Parse custom qualification words
  const rawParts = String(jobData.requiredQualifications || '')
    .split(/[,;|\n/•]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  for (const part of rawParts) {
    const words = part.split(/\s+/).map((w) => w.trim()).filter(Boolean)
    for (const w of words) {
      const cw = cleanToken(w)
      if (cw && !STOP_WORDS.has(cw) && cw.length >= 2) {
        if (TECH_DICTIONARY.some((tech) => cleanToken(tech) === cw || norm(tech).includes(cw))) {
          if (!found.has(cw)) {
            found.set(cw, w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          }
        }
      }
    }
  }

  return Array.from(found.values())
}

const SYNONYM_GROUPS = [
  ['js', 'javascript', 'es6'],
  ['ts', 'typescript'],
  ['react', 'reactjs', 'react.js', 'nextjs', 'next.js', 'react native'],
  ['node', 'nodejs', 'node.js', 'express', 'expressjs', 'express.js'],
  ['html', 'html5'],
  ['css', 'css3', 'tailwind', 'tailwindcss', 'bootstrap', 'sass'],
  ['mongo', 'mongodb', 'nosql', 'mongoose'],
  ['postgres', 'postgresql', 'sql', 'mysql'],
  ['rest', 'restapi', 'restapis', 'api', 'apis'],
  ['git', 'github', 'gitlab'],
  ['sales', 'marketing', 'digitalmarketing', 'seo', 'hubspot']
]

// Returns true if a candidate skill satisfies a required job skill
function isSkillMatched(jobSkill, candidateSkills, candidateFullText = '') {
  const j = cleanToken(jobSkill)
  if (!j) return false

  for (const candSkill of candidateSkills) {
    const c = cleanToken(candSkill)
    if (!c) continue
    if (j === c || c.includes(j) || j.includes(c)) return true

    // Check synonym group
    for (const group of SYNONYM_GROUPS) {
      const jInGroup = group.some((item) => j.includes(cleanToken(item)))
      const cInGroup = group.some((item) => c.includes(cleanToken(item)))
      if (jInGroup && cInGroup) return true
    }
  }

  // Framework implies foundation: React/Next.js/Tailwind implicitly covers HTML & CSS
  if ((j === 'html' || j === 'html5') && candidateSkills.some((s) => /react|next\.?js|frontend|web|angular|vue/i.test(s))) {
    return true
  }
  if ((j === 'css' || j === 'css3') && candidateSkills.some((s) => /tailwind|bootstrap|sass|react|next\.?js|frontend/i.test(s))) {
    return true
  }

  // Text search in candidate full profile
  if (candidateFullText && candidateFullText.includes(norm(jobSkill))) {
    return true
  }

  return false
}

function buildLogicalAnalysis(cand, jobData, reason = 'Intelligent Profile Analysis') {
  const requiredSkills = extractJobSkills(jobData)
  const candidateSkills = candidateSkillNames(cand)
  const candidateText = `${cand.name || ''} ${cand.role || ''} ${cand.currentDesignation || ''} ${candidateSkills.join(' ')} ${(cand.experience || []).join(' ')} ${(cand.education || []).join(' ')}`.toLowerCase()
  const jobTitle = norm(jobData.title || jobData.jobTitle || '')
  const candidateRole = norm(cand.role || cand.currentDesignation || '')

  // 1. Skill & Technology Match (Weight: 45%)
  const matchedRequired = []
  const missingRequired = []

  for (const reqSkill of requiredSkills) {
    if (isSkillMatched(reqSkill, candidateSkills, candidateText)) {
      matchedRequired.push(reqSkill)
    } else {
      missingRequired.push(reqSkill)
    }
  }

  let skillScore = 0
  if (requiredSkills.length > 0) {
    const ratio = matchedRequired.length / requiredSkills.length
    // Reward candidate for complementary stack technologies
    const extraTechCount = candidateSkills.filter((cs) => !matchedRequired.some((ms) => isSkillMatched(ms, [cs]))).length
    const stackBonus = Math.min(15, extraTechCount * 3)
    skillScore = Math.min(100, Math.round(ratio * 85 + stackBonus))
  } else {
    skillScore = Math.min(90, Math.max(45, candidateSkills.length * 6))
  }

  // 2. Role & Domain Alignment (Weight: 25%)
  const isTechJob = /developer|engineer|software|frontend|backend|fullstack|web|tech|programmer|coder/i.test(jobTitle)
  const isTechCandidate = /developer|engineer|software|frontend|backend|fullstack|web|tech|programmer|react|node|javascript|python|java/i.test(`${candidateRole} ${candidateText}`)
  const isSalesCandidate = /sales|marketing|lead generation|hubspot|account executive/i.test(`${candidateRole} ${candidateText}`)

  let roleScore = 60
  if (isTechJob) {
    if (isTechCandidate) {
      const titleTokens = jobTitle.split(/\s+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t))
      const hasTokenMatch = titleTokens.some((t) => candidateRole.includes(t) || candidateText.includes(t))
      roleScore = hasTokenMatch ? 95 : 85
    } else if (isSalesCandidate && candidateSkills.filter((s) => /html|css|javascript|react|node|python|java|sql/i.test(s)).length === 0) {
      roleScore = 15 // Sales candidate applying for technical role
    }
  } else {
    roleScore = 75
  }

  // 3. Experience Match (Weight: 20%)
  const minExperience = parseYears(jobData.minExperience) || 1
  let candidateExperience = parseYears(cand.totalExperience ?? cand.exp)
  if (candidateExperience == null && Array.isArray(cand.experience) && cand.experience.length > 0) {
    candidateExperience = Math.min(4, Math.max(1, cand.experience.length))
  }

  let experienceScore = 70
  if (candidateExperience != null) {
    if (candidateExperience >= minExperience) {
      experienceScore = 95
    } else {
      experienceScore = Math.max(40, Math.round((candidateExperience / Math.max(minExperience, 1)) * 90))
    }
  } else {
    // Has projects/skills but unspecified years
    experienceScore = isTechCandidate ? 80 : 60
  }

  // 4. Education & Credentials Match (Weight: 10%)
  const eduText = Array.isArray(cand.education) ? cand.education.join(' ') : String(cand.education || '')
  let educationScore = 70
  if (/b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|mca|bca|master|computer\s*science|information\s*technology/i.test(eduText)) {
    educationScore = 95
  } else if (/bachelor\s*of\s*arts|b\.?a\b|commerce|b\.?com/i.test(eduText)) {
    educationScore = isTechJob ? 45 : 85
  }

  // Overall Score Calculation
  const score = Math.max(
    5,
    Math.min(
      99,
      Math.round(
        skillScore * 0.45 +
        roleScore * 0.25 +
        experienceScore * 0.20 +
        educationScore * 0.10
      )
    )
  )

  // Generate clear strengths and concerns
  const strengths = []
  const concerns = []

  if (matchedRequired.length > 0) {
    strengths.push(`${matchedRequired.slice(0, 4).join(', ')} matched required skills`)
  }
  if (roleScore >= 80) {
    strengths.push(`Profile and background align with ${jobTitle || 'the position'}`)
  }
  if (candidateExperience != null && candidateExperience >= minExperience) {
    strengths.push(`${candidateExperience} years experience meets requirement (≥${minExperience} yrs)`)
  }
  if (educationScore >= 90) {
    strengths.push('Technical degree/education fits role requirements')
  }

  if (missingRequired.length > 0) {
    concerns.push(`Missing key required skills: ${missingRequired.slice(0, 3).join(', ')}`)
  }
  if (isTechJob && isSalesCandidate && skillScore < 30) {
    concerns.push('Background is primarily in Sales/Marketing rather than Software Development')
  }
  if (candidateExperience != null && minExperience != null && candidateExperience < minExperience) {
    concerns.push(`Experience (${candidateExperience} yrs) is below requirement (${minExperience}+ yrs)`)
  }

  let summary = ''
  if (score >= 85) {
    summary = `Strong Match: Candidate demonstrates solid proficiency in ${matchedRequired.slice(0, 3).join(', ') || 'required skills'} and aligns well with the ${jobTitle || 'role'}.`
  } else if (score >= 70) {
    summary = `Good Match: Candidate possesses relevant skills (${matchedRequired.slice(0, 3).join(', ') || 'technical foundation'}) with suitable background for ${jobTitle || 'the role'}.`
  } else if (score >= 50) {
    summary = `Potential Match: Candidate meets partial criteria but has some gaps in ${missingRequired.slice(0, 2).join(', ') || 'requirements'}.`
  } else {
    summary = `Low Match: Candidate profile does not sufficiently align with the technical requirements for ${jobTitle || 'this position'}.`
  }

  return {
    ...cand,
    score,
    matchLabel: matchLabel(score),
    analysisSummary: summary,
    matchedSkills: matchedRequired,
    missingSkills: missingRequired,
    strengths,
    concerns,
    skillsScore: skillScore,
    roleScore,
    experienceScore,
    educationScore,
    analysisSource: 'LOGICAL',
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
          analyzedCandidates.push(buildLogicalAnalysis(cand, jobData))
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
          ...buildLogicalAnalysis(cand, jobData, 'AI analysis failed'),
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
