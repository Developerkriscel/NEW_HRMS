export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { APPLICATION_SOURCE, CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { generateCandidateCode, findExistingCandidate, generateApplicationCode } from '@/lib/candidateHelpers'
import { syncPipelineStages } from '@/lib/jobHelpers'
import { JOB_STATUS } from '@/lib/jobConstants'
import Candidate from '@/models/Candidate'
import Application from '@/models/Application'
import Job from '@/models/Job'
import JobPipelineStage from '@/models/JobPipelineStage'
import CandidateJobMatch from '@/models/CandidateJobMatch'
import CandidateSkill from '@/models/CandidateSkill'
import CandidateExperience from '@/models/CandidateExperience'
import CandidateEducation from '@/models/CandidateEducation'
import { MATCHING_MODEL_VERSION, MATCHING_RULES_VERSION, getMatchLabel } from '@/lib/matchingConstants'

function normalizeBulkSource(source) {
  const normalized = String(source || '').trim().toUpperCase()
  if (APPLICATION_SOURCE[normalized]) return APPLICATION_SOURCE[normalized]
  if (['CSV', 'EXCEL', 'XLS', 'XLSX', 'RESUME'].includes(normalized)) {
    return APPLICATION_SOURCE.MANUAL
  }
  return APPLICATION_SOURCE.MANUAL
}

function splitImportList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '')
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseImportNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const match = String(value).match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

async function syncManualProfileData({ tenantId, candidateDoc, cand, session }) {
  const skills = splitImportList(cand.skills)
  if (skills.length) {
    const existingSkills = new Set((candidateDoc.skills || []).map((skill) => String(skill).toLowerCase()))
    const mergedSkills = [...(candidateDoc.skills || [])]
    for (const skillName of skills) {
      if (!existingSkills.has(skillName.toLowerCase())) mergedSkills.push(skillName)
      await CandidateSkill.updateOne(
        { tenantId, candidateId: candidateDoc._id, skillName: new RegExp(`^${skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        {
          $setOnInsert: {
            tenantId,
            candidateId: candidateDoc._id,
            skillName,
            source: 'MANUAL',
            createdBy: session.sub,
          },
        },
        { upsert: true }
      )
    }
    candidateDoc.skills = mergedSkills
  }

  const educationText = cand.educationText || splitImportList(cand.education).join(', ')
  if (educationText) {
    const existingEducation = await CandidateEducation.findOne({
      tenantId,
      candidateId: candidateDoc._id,
      degree: new RegExp(`^${String(educationText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    }).select('_id')
    if (!existingEducation) {
      await CandidateEducation.create({
        tenantId,
        candidateId: candidateDoc._id,
        degree: educationText,
        source: 'MANUAL',
        createdBy: session.sub,
      })
    }
  }

  const companyName = String(cand.currentCompany || '').trim()
  const designation = String(cand.currentDesignation || cand.role || '').trim()
  if (companyName || designation) {
    const experienceQuery = {
      tenantId,
      candidateId: candidateDoc._id,
      companyName: companyName || 'Manual Entry',
      designation: designation || null,
    }
    const existingExperience = await CandidateExperience.findOne(experienceQuery).select('_id')
    if (!existingExperience) {
      await CandidateExperience.create({
        tenantId,
        candidateId: candidateDoc._id,
        companyName: companyName || 'Manual Entry',
        designation: designation || null,
        isCurrent: !!companyName,
        description: cand.exp ? `Total experience: ${cand.exp}` : null,
        source: 'MANUAL',
        createdBy: session.sub,
      })
    }
  }

  if (candidateDoc.isModified()) await candidateDoc.save()
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const { candidates, jobId, jobTitle } = body
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return fail('Candidates array is required and cannot be empty', 400, 'VALIDATION_ERROR')
  }

  // Ensure there's a valid job to link these applications to. If not specified or invalid, try to find one.
  let activeJobId = jobId
  if (activeJobId && !String(activeJobId).match(/^[0-9a-fA-F]{24}$/)) {
    activeJobId = null;
  }

  const results = []

  try {
    if (!activeJobId) {
      const fallbackTitle = String(jobTitle || candidates.find((cand) => cand.role)?.role || 'Senior Frontend Developer').trim()
      let job = await Job.findOne({ tenantId, status: JOB_STATUS.OPEN, jobTitle: fallbackTitle }).select('_id')
      if (!job) {
        job = await Job.findOne({ tenantId, status: JOB_STATUS.OPEN }).select('_id')
      }
      if (!job) {
        // Create a fallback job so the UI doesn't break when using dummy data
        job = await Job.create({
          jobCode: `JOB-DUMMY-${Date.now()}`,
          jobTitle: fallbackTitle,
          employmentType: 'FULL_TIME',
          status: JOB_STATUS.OPEN,
          tenantId,
          createdBy: session.sub
        });
        await syncPipelineStages(tenantId, job._id, null, 'DEFAULT_HIRING')
      } else {
        const stageCount = await JobPipelineStage.countDocuments({ tenantId, jobId: job._id, isActive: true })
        if (stageCount === 0) await syncPipelineStages(tenantId, job._id, null, 'DEFAULT_HIRING')
      }
      activeJobId = job._id
    }

    const activeStageCount = await JobPipelineStage.countDocuments({ tenantId, jobId: activeJobId, isActive: true })
    if (activeStageCount === 0) await syncPipelineStages(tenantId, activeJobId, null, 'DEFAULT_HIRING')

    const appliedStage = await JobPipelineStage.findOne({ tenantId, jobId: activeJobId, isActive: true })
      .sort({ order: 1 })
      .select('_id name')
    for (const cand of candidates) {
      if (!cand.firstName?.trim() && !cand.name?.trim()) continue
      if (!cand.email?.trim()) continue

      const email = cand.email.trim().toLowerCase()
      
      // Convert generic 'name' field from UI mock to firstName/lastName
      let firstName = cand.firstName?.trim()
      let lastName = cand.lastName?.trim() || ''
      if (!firstName && cand.name) {
        const parts = cand.name.trim().split(' ')
        firstName = parts[0]
        lastName = parts.slice(1).join(' ')
      }

      let candidateDoc = await findExistingCandidate(Candidate, tenantId, { email, phone: cand.phone || '' })
      const source = normalizeBulkSource(cand.source)
      const importSkills = splitImportList(cand.skills)
      const totalExperience = cand.totalExperience ?? parseImportNumber(cand.exp)
      const expectedCtc = cand.expectedCtc ?? parseImportNumber(cand.expectedCtcText)

      if (!candidateDoc) {
        const candidateCode = await generateCandidateCode(Candidate, tenantId)
        candidateDoc = await Candidate.create({
          candidateCode,
          firstName, 
          lastName,
          email, 
          phone: cand.phone?.trim() || '000-000-0000', // Mock data lacks phone sometimes
          currentLocation: cand.currentLocation || cand.location || null,
          currentCompany: cand.currentCompany || null,
          currentDesignation: cand.currentDesignation || cand.role || null,
          educationSummary: cand.educationText || splitImportList(cand.education).join(', ') || null,
          totalExperience,
          expectedCtc,
          skills: importSkills,
          source,
          tenantId,
          createdBy: session.sub,
          activityLog: [{ type: 'CREATED', message: 'Candidate created via Bulk Import', actorName: session.sub }],
        })
      } else {
        let shouldSaveCandidate = false
        const fillIfEmpty = (field, value) => {
          if ((candidateDoc[field] === null || candidateDoc[field] === undefined || candidateDoc[field] === '') && value) {
            candidateDoc[field] = value
            shouldSaveCandidate = true
          }
        }
        fillIfEmpty('firstName', firstName)
        fillIfEmpty('lastName', lastName)
        fillIfEmpty('phone', cand.phone?.trim())
        fillIfEmpty('currentLocation', cand.currentLocation || cand.location)
        fillIfEmpty('currentCompany', cand.currentCompany)
        fillIfEmpty('currentDesignation', cand.currentDesignation || cand.role)
        fillIfEmpty('educationSummary', cand.educationText || splitImportList(cand.education).join(', '))
        fillIfEmpty('totalExperience', totalExperience)
        fillIfEmpty('expectedCtc', expectedCtc)
        if (shouldSaveCandidate) await candidateDoc.save()
      }

      await syncManualProfileData({ tenantId, candidateDoc, cand, session })

      // Check if an application already exists for this candidate and job
      let applicationDoc = await Application.findOne({ candidateId: candidateDoc._id, jobId: activeJobId, tenantId })

      if (!applicationDoc) {
        const applicationCode = await generateApplicationCode(Application, tenantId)
        applicationDoc = await Application.create({
          applicationCode,
          candidateId: candidateDoc._id,
          jobId: activeJobId,
          source,
          status: 'ACTIVE',
          currentStage: appliedStage?._id || null,
          currentStageName: appliedStage?.name || 'Applied',
          tenantId,
          activityLog: [{ type: 'APPLIED', message: 'Application created via Bulk Import', actorName: session.sub }]
        })
        
        await logAction(session, { 
          action: 'APPLICATION_CREATED', 
          entityType: 'Application', 
          entityId: applicationDoc._id, 
          description: `Application ${applicationDoc.applicationCode} created via bulk import`, 
          req 
        })
      }

      const analyzedScore = Number(cand.score ?? cand.matchScore)
      if (Number.isFinite(analyzedScore) && analyzedScore > 0) {
        await CandidateJobMatch.findOneAndUpdate(
          { tenantId, applicationId: applicationDoc._id },
          {
            $set: {
              candidateId: candidateDoc._id,
              applicationId: applicationDoc._id,
              jobId: activeJobId,
              overallScore: Math.round(Math.max(0, Math.min(100, analyzedScore))),
              skillsScore: Math.round(Math.max(0, Math.min(100, analyzedScore))),
              experienceScore: Math.round(Math.max(0, Math.min(100, analyzedScore))),
              educationScore: 50,
              locationScore: cand.location ? 70 : 50,
              ctcScore: 50,
              noticeScore: 50,
              screeningScore: Math.round(Math.max(0, Math.min(100, analyzedScore))),
              matchLabel: getMatchLabel(Math.round(Math.max(0, Math.min(100, analyzedScore)))),
              matchedSkills: { required: cand.matchedSkills || [], preferred: [] },
              missingSkills: { required: cand.missingSkills || [], preferred: [] },
              strengths: cand.strengths || [],
              concerns: (cand.concerns || []).map((text) => ({ severity: 'MODERATE', text })),
              summary: cand.analysisSummary || `Imported candidate analyzed at ${Math.round(analyzedScore)}% match.`,
              modelVersion: MATCHING_MODEL_VERSION,
              rulesVersion: MATCHING_RULES_VERSION,
              generatedAt: new Date(),
              tenantId,
              updatedBy: session.sub,
            },
            $setOnInsert: { createdBy: session.sub },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      }

      results.push(applicationDoc)
    }

    return ok(results, `Successfully imported ${results.length} candidates.`, 201)
  } catch (error) {
    const fs = require('fs')
    fs.writeFileSync('bulk-apply-error.log', error.stack || error.message)
    return fail(`Bulk apply failed: ${error.message}`, 400, 'VALIDATION_ERROR')
  }
})
