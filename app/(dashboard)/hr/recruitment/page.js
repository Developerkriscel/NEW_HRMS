'use client'

import { Plus, Briefcase, Users, UploadCloud, FileSpreadsheet, Download, UserPlus, Calendar, FileText, Sparkles, CheckCircle2, ChevronRight, ChevronDown, Check, Edit, Trash2, PowerOff, PlayCircle, PauseCircle, X, Eye, Globe, Clock, MapPin, DollarSign, Mail, Send, Phone, AlertCircle, Loader2, Undo2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { PositionDetailsModal } from '@/components/pages/recruitment/PositionDetailsModal'
import { SendOfferModal } from '@/components/pages/recruitment/SendOfferModal'
import { OpenPositionModal } from '@/components/pages/recruitment/OpenPositionModal'
import { PublishJobModal } from '@/components/pages/recruitment/PublishJobModal'
import ManualCandidateModal from '@/components/pages/recruitment/ManualCandidateModal'
import CandidateSpreadsheetEditor from '@/components/pages/recruitment/CandidateSpreadsheetEditor'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useRecruitmentStore } from '@/store/recruitmentStore'
import { useAuthStore } from '@/store/authStore'
import { candidateApi } from '@/services/candidateApi'
import { jobApi } from '@/services/jobApi'
import { interviewApi } from '@/services/interviewApi'
import { employeeApi } from '@/services/employeeApi'
import { departmentApi } from '@/services/departmentApi'

// Utility: parse a CSV string into an array of candidate-shaped objects
// Supports any common column names (partial match, case-insensitive)
function parseCSVLine(line, delimiter = ',') {
  // Handle quoted fields that may contain commas
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}
function findColIdx(headers, patterns) {
  return headers.findIndex(h => patterns.some(p => h.includes(p)))
}

function detectDelimitedFileSeparator(headerLine = '') {
  const candidates = [',', '\t', ';']
  return candidates
    .map((delimiter) => ({ delimiter, count: parseCSVLine(headerLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ','
}

function parseCSVToCandidates(csvText, delimiterOverride = null) {
  const normalizedText = String(csvText || '').replace(/^\uFEFF/, '')
  const lines = normalizedText.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 1) return []
  const delimiter = delimiterOverride || detectDelimitedFileSeparator(lines[0])
  
  const rawHeaders = parseCSVLine(lines[0], delimiter)
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/["'\r]/g, '').trim())
  
  // Flexible header matching - partial, case-insensitive
  const nameIdx = findColIdx(headers, ['name', 'candidate', 'full name', 'fullname'])
  const firstIdx = findColIdx(headers, ['first'])
  const lastIdx = findColIdx(headers, ['last', 'surname'])
  const emailIdx = findColIdx(headers, ['email', 'e-mail', 'mail'])
  const phoneIdx = findColIdx(headers, ['phone', 'mobile', 'contact', 'cell'])
  const expIdx = findColIdx(headers, ['exp', 'experience', 'years', 'yrs'])
  const roleIdx = findColIdx(headers, ['role', 'title', 'position', 'designation', 'job'])
  const skillsIdx = findColIdx(headers, ['skill', 'technology', 'tech stack'])
  const locationIdx = findColIdx(headers, ['location', 'city'])
  
  // Need at least one identifying column
  const hasName = nameIdx !== -1 || (firstIdx !== -1)
  const hasEmail = emailIdx !== -1
  if (!hasName && !hasEmail) {
    // Last resort: just use first 3 columns as name, email, phone
    if (headers.length >= 1) {
      // Try to process anyway using positional guessing
      return lines.slice(1).map((line, i) => {
        const cols = parseCSVLine(line, delimiter)
        return {
          id: `csv-${i}`,
          name: cols[0] || '',
          email: cols[1] || '',
          phone: cols[2] || '',
      exp: null,
      role: '',
      skills: [],
      location: '',
      score: null,
      source: 'CSV',
        }
      }).filter(c => (c.name || c.email) && c.name !== rawHeaders[0]) // skip header row if repeated
    }
    return []
  }
  
  return lines.slice(1).map((line, i) => {
    const cols = parseCSVLine(line, delimiter)
    let name = ''
    if (nameIdx !== -1) {
      name = cols[nameIdx] || ''
    } else if (firstIdx !== -1) {
      name = [(cols[firstIdx] || ''), (lastIdx !== -1 ? cols[lastIdx] || '' : '')].filter(Boolean).join(' ')
    }
    return {
      id: `csv-${i}`,
      name: name.replace(/\r/g, ''),
      email: (emailIdx !== -1 ? cols[emailIdx] : '') || '',
      phone: (phoneIdx !== -1 ? cols[phoneIdx] : '') || '',
      exp: expIdx !== -1 ? cols[expIdx] || null : null,
      role: roleIdx !== -1 ? cols[roleIdx] || '' : '',
      skills: skillsIdx !== -1 ? splitList(cols[skillsIdx]) : [],
      location: locationIdx !== -1 ? cols[locationIdx] || '' : '',
      score: null,
      source: 'CSV',
    }
  }).filter(c => (c.name || c.email) && c.name.trim() !== '')
}

function splitList(value) {
  return String(value || '')
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ')
}

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter((token) => token.length > 1)
}

function parseExperienceYears(value) {
  if (value == null || value === '') return null
  const match = String(value).match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function parseRequiredYears(position) {
  const values = [position?.experience, position?.description, position?.responsibilities].filter(Boolean).join(' ')
  const numbers = [...String(values).matchAll(/(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]))
  return numbers.length ? Math.min(...numbers) : 0
}

function extractPositionSkills(position) {
  const explicit = splitList(`${position?.requiredSkills || ''},${position?.preferredSkills || ''}`)
  if (explicit.length) return explicit
  const text = `${position?.title || ''} ${position?.description || ''} ${position?.responsibilities || ''}`
  const common = ['react', 'next', 'node', 'javascript', 'typescript', 'python', 'java', 'mongodb', 'sql', 'excel', 'sales', 'marketing', 'design', 'figma', 'hr', 'payroll']
  return common.filter((skill) => normalizeText(text).includes(skill))
}

function getMatchLabel(score) {
  if (score >= 85) return 'Strong Match'
  if (score >= 70) return 'Good Match'
  if (score >= 50) return 'Potential Match'
  return 'Low Match'
}

function CandidateBoardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, columnIndex) => (
        <div key={columnIndex} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-6 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <div key={cardIndex} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="h-6 w-12 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-12 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function analyzeCandidateForPosition(candidate, position) {
  const candidateText = normalizeText([
    candidate.name,
    candidate.role,
    candidate.exp,
    candidate.location,
    ...(candidate.skills || []),
    ...(candidate.education || []),
    ...(candidate.experience || []),
  ].filter(Boolean).join(' '))
  const positionTitleTokens = tokenize(position?.title)
  const positionDeptTokens = tokenize(position?.department)
  const positionSkills = extractPositionSkills(position)
  const candidateSkills = (candidate.skills?.length ? candidate.skills : splitList(candidate.role)).map(normalizeText)
  const matchedSkills = positionSkills.filter((skill) => candidateSkills.some((own) => own.includes(normalizeText(skill))) || candidateText.includes(normalizeText(skill)))
  const titleHits = positionTitleTokens.filter((token) => candidateText.includes(token)).length
  const deptHits = positionDeptTokens.filter((token) => candidateText.includes(token)).length
  const candidateYears = parseExperienceYears(candidate.exp)
  const requiredYears = parseRequiredYears(position)
  const skillScore = positionSkills.length ? Math.round((matchedSkills.length / positionSkills.length) * 40) : Math.min(25, titleHits * 8)
  const titleScore = positionTitleTokens.length ? Math.round((titleHits / positionTitleTokens.length) * 20) : 10
  const expScore = candidateYears == null
    ? 8
    : requiredYears <= 0
      ? 15
      : Math.min(20, Math.round((candidateYears / requiredYears) * 20))
  const deptScore = positionDeptTokens.length ? Math.min(10, deptHits * 5) : 5
  const completenessScore = ['name', 'email', 'phone'].reduce((sum, key) => sum + (candidate[key] ? 3 : 0), 0)
  const score = Math.max(20, Math.min(98, skillScore + titleScore + expScore + deptScore + completenessScore))
  const strengths = []
  const concerns = []
  if (matchedSkills.length) strengths.push(`Matched skills: ${matchedSkills.slice(0, 4).join(', ')}`)
  if (titleHits > 0) strengths.push('Role/title aligns with position')
  if (candidateYears != null && requiredYears > 0 && candidateYears >= requiredYears) strengths.push(`${candidateYears}+ years meets experience need`)
  if (positionSkills.length && matchedSkills.length < Math.ceil(positionSkills.length / 2)) concerns.push('Required skills need manual review')
  if (candidateYears == null) concerns.push('Experience years not clearly available')
  if (!candidate.email) concerns.push('Email missing, cannot add to pipeline until completed')
  return {
    ...candidate,
    score,
    matchScore: score,
    matchLabel: getMatchLabel(score),
    matchedSkills,
    missingSkills: positionSkills.filter((skill) => !matchedSkills.includes(skill)),
    strengths,
    concerns,
    analysisSummary: `${getMatchLabel(score)} for ${position?.title || 'this role'} based on uploaded profile data.`,
  }
}

export default function RecruitmentDashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN'
  const canManageInterviews = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role)
  const [activeTab, setActiveTab] = useState('positions')
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [showOpenPositionModal, setShowOpenPositionModal] = useState(false)
  const [editingPositionForModal, setEditingPositionForModal] = useState(null)
  const [positionToDelete, setPositionToDelete] = useState(null)
  const [publishingPosition, setPublishingPosition] = useState(null)
  const [selectedPositionForCandidates, setSelectedPositionForCandidates] = useState(null)
  const [positionPickerOpen, setPositionPickerOpen] = useState(false)
  const [showAllCandidatesModal, setShowAllCandidatesModal] = useState(false)
  const [allCandidatesRows, setAllCandidatesRows] = useState([])
  const [allCandidatesLoading, setAllCandidatesLoading] = useState(false)
  const [allCandidatesLoadingMore, setAllCandidatesLoadingMore] = useState(false)
  const [allCandidatesPage, setAllCandidatesPage] = useState(0)
  const [allCandidatesHasMore, setAllCandidatesHasMore] = useState(false)
  const [allCandidatesError, setAllCandidatesError] = useState('')
  
  // Candidate Data State
  const [isDragging, setIsDragging] = useState(false)
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true)
  const fileInputRef = useRef(null)
  const resumeInputRef = useRef(null)
  const candidatesLoadedRef = useRef(false)
  const candidatesLoadedJobRef = useRef(null)
  const candidatesLoadingRef = useRef(null)
  const positionPickerRef = useRef(null)
  
  // Workflow States
  const [candidatePhase, setCandidatePhase] = useState('idle') // idle, upload, processing, uploaded, analyzing, results
  const [candidateImportMode, setCandidateImportMode] = useState('ai') // ai or directExcel
  const [directImportSaving, setDirectImportSaving] = useState(false)
  // Local status map for AI Match table after save/skip decisions.
  const [localCandidateStatuses, setLocalCandidateStatuses] = useState({}) // { [email]: 'Pipeline' | 'Rejected' }
  const [candidateActionLoading, setCandidateActionLoading] = useState({})
  // Real parsed candidates from backend API or CSV parsing
  const [parsedCandidates, setParsedCandidates] = useState([])
  const [uploadError, setUploadError] = useState(null)
  const [uploadFileName, setUploadFileName] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  const [showManualCandidateModal, setShowManualCandidateModal] = useState(false)
  const [showCandidateSpreadsheetEditor, setShowCandidateSpreadsheetEditor] = useState(false)
  const [selectedOfferCandidate, setSelectedOfferCandidate] = useState(null)
  const [candidateToUndo, setCandidateToUndo] = useState(null)
  const [undoConfirmError, setUndoConfirmError] = useState(null)
  const [schedulingCandidate, setSchedulingCandidate] = useState(null)
  const [schedulingStep, setSchedulingStep] = useState('details') // details, email, success
  const [schedulingFormData, setSchedulingFormData] = useState(null)
  const [emailDraft, setEmailDraft] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState(null)
  const [isSchedulingInvite, setIsSchedulingInvite] = useState(false)
  const [isResendingInvite, setIsResendingInvite] = useState(false)
  const [schedulingError, setSchedulingError] = useState(null)
  const [interviewers, setInterviewers] = useState([])
  const [interviewersLoading, setInterviewersLoading] = useState(false)
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState([])
  const [selectedCandidateInfo, setSelectedCandidateInfo] = useState(null)
  const [positionsLoading, setPositionsLoading] = useState(true)
  const [positionsError, setPositionsError] = useState('')
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [positionActionLoading, setPositionActionLoading] = useState(false)
  const [positionActionError, setPositionActionError] = useState(null)
  
  // Global Store State
  const { candidates: allCandidatesData, offers: offersList, rejected: rejectedList, error: candidateFetchError, updateCandidateStatus, deleteRejectedCandidate, updateCandidateStage, undoCandidateStage, selectCandidate, scheduleInterview, sendOffer, acceptOffer, rejectOffer, fetchCandidates, loadMoreCandidates, hasMoreCandidates, loading, loadingMore } = useRecruitmentStore()
  const schedulingCandidateKey = schedulingCandidate?.id || schedulingCandidate?.applicationId || schedulingCandidate?.candidateId || null

  useEffect(() => {
    if (!schedulingCandidateKey) return undefined
    let cancelled = false
    setSelectedInterviewerIds([])
    setInterviewersLoading(true)
    employeeApi.getAll({ page: 0, size: 100, status: 'ACTIVE' })
      .then((response) => {
        if (cancelled) return
        const data = response?.data?.data
        const rows = data?.content || data?.items || data || []
        setInterviewers(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setInterviewers([])
      })
      .finally(() => {
        if (!cancelled) setInterviewersLoading(false)
      })
    return () => { cancelled = true }
  }, [schedulingCandidateKey])
  
  const fetchPositions = async ({ force = false } = {}) => {
    setPositionsLoading(true)
    setPositionsError('')
    try {
      const res = await jobApi.list({ size: 50 }, { devMock: false, ...(force ? { skipCache: true } : {}) })
      const jobs = res.data?.data?.content || res.data?.data || []
      const mappedJobs = jobs.map(job => ({
        id: job._id || job.id,
        title: job.jobTitle || job.title,
        department: job.department?.name || job.department || 'Unknown',
        departmentId: job.department?._id || job.department,
        status: job.status === 'OPEN' ? 'Active' : job.status === 'DRAFT' ? 'Draft' : ['ON_HOLD', 'PAUSED'].includes(job.status) ? 'On Hold' : job.status === 'CLOSED' ? 'Closed' : job.status === 'CANCELLED' ? 'Cancelled' : job.status,
        jobType: job.employmentType === 'FULL_TIME' ? 'Full-time' : job.employmentType === 'PART_TIME' ? 'Part-time' : job.employmentType === 'CONTRACT' ? 'Contract' : job.employmentType === 'INTERN' ? 'Intern' : 'Full-time',
        employmentType: 'Permanent',
        workMode: job.workMode === 'ONSITE' ? 'On-site' : job.workMode === 'HYBRID' ? 'Hybrid' : job.workMode === 'REMOTE' ? 'Remote' : 'On-site',
        openings: job.totalOpenings || 1,
        location: job.location?.name || job.location,
        locationId: job.location?._id || job.location,
        hiringManager: job.hiringManager?.firstName ? `${job.hiringManager.firstName} ${job.hiringManager.lastName || ''}`.trim() : '',
        hiringManagerId: job.hiringManager?._id || job.hiringManager,
        recruiter: job.recruiter?.firstName ? `${job.recruiter.firstName} ${job.recruiter.lastName || ''}`.trim() : '',
        recruiterId: job.recruiter?._id || job.recruiter,
        description: job.jobSummary || '',
        responsibilities: job.responsibilities || '',
        requiredSkills: job.requiredQualifications || '',
        preferredSkills: job.preferredQualifications || '',
        experience: job.minExperience ? `${job.minExperience}+ Years` : '',
        salaryMin: job.internalMinCtc || '',
        salaryMax: job.internalMaxCtc || '',
        currency: job.currency || 'INR',
        hiringManager: job.hiringManager?.firstName ? `${job.hiringManager.firstName} ${job.hiringManager.lastName || ''}` : '',
        hiringManagerId: job.hiringManager?._id || job.hiringManager,
        recruiter: job.recruiter?.firstName ? `${job.recruiter.firstName} ${job.recruiter.lastName || ''}` : '',
        recruiterId: job.recruiter?._id || job.recruiter,
        openingDate: job.openingDate ? new Date(job.openingDate).toISOString().split('T')[0] : '',
        targetClosingDate: job.targetClosingDate ? new Date(job.targetClosingDate).toISOString().split('T')[0] : '',
        expectedJoiningDate: job.expectedJoiningDate ? new Date(job.expectedJoiningDate).toISOString().split('T')[0] : ''
      }))
      setPositionsList(mappedJobs)
      setPositionActionError(null)
    } catch (e) {
      console.error('Failed to fetch positions', e)
      setPositionsError(e.response?.data?.message || e.message || 'Failed to load positions. Please retry.')
    } finally {
      setPositionsLoading(false)
    }
  }

  const candidateFetchParams = (position = selectedPositionForCandidates) => {
    const job = position?.id || position?._id || position?.jobId
    return job ? { job } : {}
  }

  const loadAllCandidates = async ({ append = false } = {}) => {
    const page = append ? allCandidatesPage + 1 : 0
    if (append ? allCandidatesLoadingMore : allCandidatesLoading) return
    if (append && !allCandidatesHasMore) return

    if (append) setAllCandidatesLoadingMore(true)
    else {
      setAllCandidatesLoading(true)
      setAllCandidatesError('')
    }
    try {
      const response = await candidateApi.list(
        { openPositionsOnly: 'true', page, size: 50 },
        { skipCache: true, devMock: false }
      )
      const data = response.data?.data || {}
      const rows = Array.isArray(data.content) ? data.content : []
      setAllCandidatesRows((previous) => append ? [...previous, ...rows] : rows)
      setAllCandidatesPage(page)
      setAllCandidatesHasMore(page < Number(data.totalPages || 1) - 1)
    } catch (error) {
      setAllCandidatesError(error.response?.data?.message || error.message || 'Failed to load candidates.')
    } finally {
      setAllCandidatesLoading(false)
      setAllCandidatesLoadingMore(false)
    }
  }

  const openAllCandidates = async () => {
    setShowAllCandidatesModal(true)
    await loadAllCandidates()
  }

  const openCandidatePosition = async (candidate) => {
    const position = positionsList.find((item) => String(item.id) === String(candidate.jobId))
    if (!position) return
    setShowAllCandidatesModal(false)
    await handlePositionSelection(position.id)
  }

  const ensureCandidatesLoaded = async ({ force = false, position = selectedPositionForCandidates } = {}) => {
    const jobId = position?.id || position?._id || position?.jobId || null
    if (!jobId) return
    if (!force && candidatesLoadedRef.current && candidatesLoadedJobRef.current === String(jobId)) return
    if (!force && candidatesLoadingRef.current?.jobId === String(jobId)) return candidatesLoadingRef.current.promise

    const promise = fetchCandidates({ ...candidateFetchParams(position), force })
    const tracked = promise
      .then(() => {
        candidatesLoadedRef.current = true
        candidatesLoadedJobRef.current = String(jobId)
      })
      .catch((error) => {
        candidatesLoadedRef.current = false
        candidatesLoadedJobRef.current = null
        throw error
      })
      .finally(() => {
        if (candidatesLoadingRef.current?.promise === tracked) candidatesLoadingRef.current = null
      })
    candidatesLoadingRef.current = { jobId: String(jobId), promise: tracked }
    return tracked
  }

  const handlePositionSelection = async (positionId) => {
    if (!positionId) return
    const position = positionsList.find((item) => String(item.id) === String(positionId))
    if (!position) return

    setAnalysisError(null)
    setCandidatePhase('idle')
    setActiveCandidateKpi('all')

    let nextPosition = position
    setSelectedPositionForCandidates(nextPosition)
    setActiveTab('candidates')
    const detailsPromise = jobApi.get(position.id, { timeout: 30000 })
      .then((res) => {
        const fullJob = res.data?.data || res.data
        nextPosition = { ...position, pipelineStages: fullJob.pipelineStages || [] }
        setSelectedPositionForCandidates(nextPosition)
        return nextPosition
      })
      .catch((error) => {
        console.error('Failed to load selected position details:', error)
        return nextPosition
      })
    try {
      await Promise.all([ensureCandidatesLoaded({ force: true, position }), detailsPromise])
    } catch (error) {
      console.warn('Failed to load selected position candidates:', error)
      setAnalysisError(error.response?.data?.message || error.message || 'Candidate data is taking too long to load. Please retry.')
    }
  }

  const candidateById = (candidateId) => candidatesData.find((candidate) => String(candidate.id) === String(candidateId))
  const belongsToSelectedPosition = (candidate) => {
    const jobId = selectedPositionForCandidates?.id || selectedPositionForCandidates?._id || selectedPositionForCandidates?.jobId
    return !jobId || String(candidate.jobId || '') === String(jobId)
  }

  const handleCandidateStageChange = async (candidateId, stageName) => {
    const actionKey = `stage:${candidateId}`
    if (candidateActionLoading[actionKey]) return
    setAnalysisError(null)
    setCandidateActionLoading((prev) => ({ ...prev, [actionKey]: true }))
    try {
      await updateCandidateStage(candidateId, stageName)
      void fetchCandidates({ ...candidateFetchParams(), force: true }).catch((error) => {
        console.warn('Candidate refresh after stage change failed:', error)
      })
    } catch (error) {
      setAnalysisError(error.response?.data?.message || error.message || 'Failed to move candidate to the selected stage.')
    } finally {
      setCandidateActionLoading((prev) => {
        const next = { ...prev }
        delete next[actionKey]
        return next
      })
    }
  }

  const handleCandidateDrop = async (candidateId, stage) => {
    const candidate = candidateById(candidateId)
    if (!candidate) return
    try {
      const stageCategory = String(stage?.category || '').toUpperCase()
      const stageName = String(stage?.name || '')
      const isDecisionStage = ['SELECTED', 'OFFER', 'HIRED'].includes(stageCategory) || /select|offer|hired/i.test(stageName)

      if (isDecisionStage && !candidate.interviewAt) {
        setAnalysisError('Schedule and complete an interview before moving this candidate to selection, offer, or hired.')
        return
      }
      if (stageCategory === 'SELECTED' || /select/i.test(stageName)) {
        await handleCandidateStatusChange(candidate, 'Selected')
        return
      }
      if (stageCategory === 'OFFER' || /offer/i.test(stageName)) {
        await handleCandidateStatusChange(candidate, 'Selected')
        setSelectedOfferCandidate({ ...candidate, status: 'Selected' })
        return
      }
      if (stageCategory === 'HIRED' || /hired/i.test(stageName)) return
      await handleCandidateStageChange(candidate.id, stageName)
    } catch (error) {
      setAnalysisError(error.response?.data?.message || error.message || 'Failed to move candidate to the selected stage.')
    }
  }

  const handleOfferDecision = async (candidate, decision) => {
    const actionKey = `offer:${candidate.id}`
    if (candidateActionLoading[actionKey]) return
    setCandidateActionLoading((prev) => ({ ...prev, [actionKey]: true }))
    try {
      if (decision === 'accept') await acceptOffer(candidate)
      else await rejectOffer(candidate)
      void fetchCandidates({ ...candidateFetchParams(), force: true }).catch((error) => {
        console.warn('Candidate refresh after offer action failed:', error)
      })
    } catch (error) {
      setAnalysisError(error.response?.data?.message || error.message || `Failed to ${decision} offer.`)
    } finally {
      setCandidateActionLoading((prev) => {
        const next = { ...prev }
        delete next[actionKey]
        return next
      })
    }
  }

  const handleCandidateUndo = async (candidate) => {
    const actionKey = `undo:${candidate.id}`
    if (candidateActionLoading[actionKey]) return
    setCandidateActionLoading((prev) => ({ ...prev, [actionKey]: true }))
    setAnalysisError(null)
    setUndoConfirmError(null)
    try {
      await undoCandidateStage(candidate)
      try {
        await fetchCandidates({ ...candidateFetchParams(), force: true })
      } catch (refreshError) {
        // The undo write has already succeeded; a slow read must not make the
        // user retry the action and create a misleading failure state.
        console.warn('Candidate undo succeeded but refresh failed:', refreshError)
      }
      setCandidateToUndo(null)
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to return candidate to the previous stage.'
      setAnalysisError(message)
      setUndoConfirmError(message)
    } finally {
      setCandidateActionLoading((prev) => {
        const next = { ...prev }
        delete next[actionKey]
        return next
      })
    }
  }

  const requestCandidateUndo = (candidate) => {
    if (!candidate || candidateActionLoading[`undo:${candidate.id}`]) return
    setUndoConfirmError(null)
    setCandidateToUndo(candidate)
  }

  const handleRejectedCandidateDelete = async (candidate) => {
    if (!candidate || (candidate.status !== 'Rejected' && candidate.status !== 'REJECTED')) return
    if (!window.confirm(`Delete ${candidate.name || 'this rejected application'} from the pipeline? The candidate profile will be kept.`)) return
    const actionKey = `delete:${candidate.id}`
    if (candidateActionLoading[actionKey]) return
    setCandidateActionLoading((prev) => ({ ...prev, [actionKey]: true }))
    setAnalysisError(null)
    try {
      await deleteRejectedCandidate(candidate)
      try {
        await fetchCandidates({ ...candidateFetchParams(), force: true })
      } catch (refreshError) {
        console.warn('Rejected application deleted but candidate refresh failed:', refreshError)
      }
    } catch (error) {
      setAnalysisError(error.response?.data?.message || error.message || 'Failed to delete rejected application.')
    } finally {
      setCandidateActionLoading((prev) => {
        const next = { ...prev }
        delete next[actionKey]
        return next
      })
    }
  }

  useEffect(() => {
    fetchPositions()
    let cancelled = false
    departmentApi.getAll()
      .then((response) => {
        if (cancelled) return
        const rows = response.data?.data?.content || response.data?.data || []
        setDepartments(Array.isArray(rows) ? rows.filter((department) => department.active !== false) : [])
      })
      .catch((error) => {
        if (cancelled) return
        setDepartments([])
      })
    employeeApi.getAll({ page: 0, size: 100, status: 'ACTIVE' })
      .then((response) => {
        if (cancelled) return
        const data = response?.data?.data
        const rows = data?.content || data?.items || data || []
        setEmployees(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setEmployees([])
      })
    return () => { cancelled = true }
  }, [])

  const formatInterviewSchedule = (cand) => {
    if (!cand?.interviewAt) return null
    const date = new Date(cand.interviewAt)
    if (Number.isNaN(date.getTime())) return null
    const dateText = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    const start = cand.interviewTime || date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const end = cand.interviewEndTime ? ` - ${cand.interviewEndTime}` : ''
    return `${dateText}, ${start}${end}`
  }

  const getCandidateStageCategory = (candidate) => {
    const stage = selectedPositionForCandidates?.pipelineStages?.find((item) => String(item.name) === String(candidate?.stage))
    // The API resolves lifecycle/stage category from the database stage id.
    // Prefer it over a stale or reused display name such as "Shortlisted".
    return candidate?.stageCategory || stage?.category || null
  }



  const renderCandidateCard = (cand) => {
    // Determine the lane/visual based on status and stage
    const isPipelineStatus = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral'].includes(cand.status)
    const isApplied = isPipelineStatus && (cand.stage === 'Screening' || cand.stage === 'Applied' || cand.stage === 'AI Match' || !cand.stage);
    const isInterviewing = isPipelineStatus && !isApplied;
    
    // Find next dynamic stage
    let nextStage = null;
    if (selectedPositionForCandidates?.pipelineStages?.length > 0) {
      const activeStages = selectedPositionForCandidates.pipelineStages.filter(s => s.isActive !== false).sort((a, b) => a.order - b.order);
      const currentIndex = activeStages.findIndex(s => s.name === cand.stage);
      if (currentIndex >= 0 && currentIndex < activeStages.length - 1) {
        const next = activeStages[currentIndex + 1];
        if (next.category === 'SELECTED' || next.category === 'OFFER' || next.category === 'HIRED' || next.name.toLowerCase().includes('offer') || next.name.toLowerCase().includes('select')) {
          nextStage = null;
        } else {
          nextStage = next.name;
        }
      }
    }
    
    return (
      <div 
        key={cand.id} 
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('candidateId', cand.id);
        }}
        className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {cand.status === 'HIRED' && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>}
        {(cand.status === 'Rejected' || cand.status === 'REJECTED') && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
        
        <div className="flex justify-between items-start mb-3">
          <div onClick={() => setSelectedCandidateInfo(cand)} className="cursor-pointer group-hover:opacity-80 transition-opacity">
            <h4 className="font-bold text-slate-900 dark:text-white leading-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{cand.name}</h4>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5 mb-1">{cand.role}</p>
            {cand.phone && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Phone className="w-3 h-3" /> {cand.phone}
              </div>
            )}
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
              cand.score >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
              cand.score >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
              'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
          }`}>
            <Sparkles className="w-3 h-3" /> {Math.round(cand.score || 0)}%
          </div>
        </div>
        
        {cand.status === 'Referral' && (
          <div className="mb-3 inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100 dark:border-indigo-500/20">
            <UserPlus className="w-3 h-3"/> Referral
          </div>
        )}

        {cand.stage && cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
          <div className="mb-2 flex items-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="mt-0.5"><Clock className="w-3.5 h-3.5 text-slate-400"/></div>
            <div>
              <div>{cand.interviewRoundName || cand.stage}</div>
              {formatInterviewSchedule(cand) && (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-3 h-3" /> {formatInterviewSchedule(cand)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Dates */}
        <div className="mb-4 space-y-1.5 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-400"/> Applied:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {cand.appliedAt ? new Date(cand.appliedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
            </span>
          </div>
          
          {/* Show Shortlisted date if available or if they moved past applied */}
          {(cand.shortlistedAt || cand.stage?.toLowerCase().includes('shortlist') || (!['Screening', 'Applied', 'AI Match'].includes(cand.stage) && cand.stage)) && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-purple-400"/> Shortlisted:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {cand.shortlistedAt ? new Date(cand.shortlistedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                  : (cand.stage?.toLowerCase().includes('shortlist') && cand.stageEnteredAt) ? new Date(cand.stageEnteredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                  : 'Not recorded'}
              </span>
            </div>
          )}

          {/* Always show interview date if stage implies they moved past applied */}
          {(cand.interviewStageAt || cand.interviewAt) && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-400"/> Select for interview:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {new Date(cand.interviewStageAt || cand.interviewAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          )}

          {/* Show Selected date if candidate is in Selected, Offered or Hired status */}
          {cand.selectedAt && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-emerald-400"/> Selected:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {new Date(cand.selectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          )}



          {(() => {
            const offer = offersList.find(o => o.id === cand.id);
            if (offer && (offer.offerSentAt || (offer.offerStatus && offer.offerStatus !== 'Draft'))) {
              return (
                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-1.5 mt-1.5">
                  <span className="flex items-center gap-1"><Send className="w-3 h-3 text-amber-500"/> Offer Sent:</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {offer.offerSentAt ? new Date(offer.offerSentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          {(() => {
            const stageLower = String(cand.stage || '').toLowerCase();
            const stageCategory = getCandidateStageCategory(cand)
            const isRejected = cand.status === 'Rejected' || cand.status === 'REJECTED';
            // A stale/custom stage label must not turn an Offered card into
            // onboarding. Lifecycle status wins over the stage label.
            const isHiredStage = cand.status !== 'Offered' && (cand.status === 'HIRED' || cand.offerStatus === 'Accepted' || stageCategory === 'HIRED' || stageLower.includes('hired'));
            const isOfferStage = !isHiredStage && (stageCategory === 'OFFER' || stageLower.includes('offer') || cand.status === 'Offered');
            const isSelectedStage = !isHiredStage && !isOfferStage && (stageCategory === 'SELECTED' || stageLower.includes('select') || cand.status === 'Selected');
            const isInterviewStage = !isRejected && !isHiredStage && !isOfferStage && !isSelectedStage && (stageCategory === 'INTERVIEW' || !!cand.interviewAt || stageLower.includes('interview') || stageLower.includes('round'));
            const isShortlistStage = !isRejected && !isHiredStage && !isOfferStage && !isSelectedStage && !isInterviewStage && (stageCategory === 'SCREENING' || stageLower.includes('shortlist') || stageLower.includes('screen'));

            if (isRejected) {
              return (
                <div className="flex gap-2">
                  <button onClick={() => handleCandidateStatusChange(cand, 'Pipeline')} disabled={candidateActionLoading[cand.email || cand.id]} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                    Restore to Pipeline
                  </button>
                  <button onClick={() => handleRejectedCandidateDelete(cand)} disabled={candidateActionLoading[`delete:${cand.id}`]} title="Delete rejected application" aria-label={`Delete ${cand.name || 'rejected application'}`} className="inline-flex items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            }

            if (isHiredStage) {
              return (
                <div className="w-full bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4"/> Ready for onboarding
                </div>
              );
            }

            if (isOfferStage || isSelectedStage) {
              const offer = offersList.find(o => o.id === cand.id);
              const offerAlreadySent = ['Sent', 'Accepted', 'Rejected'].includes(offer?.offerStatus)
              const selectionApprovalPending = cand.selectionStatus === 'SELECTION_APPROVAL_PENDING'
              if (!offerAlreadySent && selectionApprovalPending) {
                return (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => requestCandidateUndo(cand)} disabled={candidateActionLoading[`undo:${cand.id}`]} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                      <Undo2 className="w-4 h-4"/> {candidateActionLoading[`undo:${cand.id}`] ? 'Returning...' : 'Undo Selection'}
                    </button>
                    <div className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Selection approval pending
                    </div>
                  </div>
                );
              }
              if (!offer || !offer.offerStatus || offer.offerStatus === 'Draft') {
                return (
                  <div className="flex flex-col gap-2">
                    {isSelectedStage && (
                      <button onClick={() => requestCandidateUndo(cand)} disabled={candidateActionLoading[`undo:${cand.id}`]} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                        <Undo2 className="w-4 h-4"/> {candidateActionLoading[`undo:${cand.id}`] ? 'Returning...' : 'Undo Selection'}
                      </button>
                    )}
                    <button onClick={() => setSelectedOfferCandidate(cand)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-md shadow-emerald-500/20">
                      <FileText className="w-4 h-4"/> Create Offer Letter
                    </button>
                  </div>
                );
              }
              if (offer.offerStatus === 'Sent') {
                return (
                  <div className="flex flex-col gap-2">
                    <div className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5"/> Offer Sent - Waiting
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOfferDecision(cand, 'reject')} disabled={candidateActionLoading[`offer:${cand.id}`]} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60">Declined</button>
                      <button onClick={() => handleOfferDecision(cand, 'accept')} disabled={candidateActionLoading[`offer:${cand.id}`]} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60">Accepted</button>
                    </div>
                    {isOfferStage && (
                      <button onClick={() => requestCandidateUndo(cand)} disabled={candidateActionLoading[`undo:${cand.id}`]} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-60">
                        <Undo2 className="w-3.5 h-3.5"/> {candidateActionLoading[`undo:${cand.id}`] ? 'Returning...' : 'Undo to Previous Stage'}
                      </button>
                    )}
                  </div>
                );
              }
              if (offer.offerStatus === 'Accepted') {
                return (
                  <div className="w-full bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4"/> Ready for onboarding
                  </div>
                );
              }
              if (offer.offerStatus === 'Rejected') {
                return (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                    <X className="w-4 h-4"/> Offer Declined
                  </div>
                );
              }
            }

            // Early stages: Shortlist, Interview, Applied, Screening
            return (
              <div className="flex flex-col gap-2">
                {(isShortlistStage || isInterviewStage) && (
                  <button onClick={() => requestCandidateUndo(cand)} disabled={candidateActionLoading[`undo:${cand.id}`]} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-60">
                    <Undo2 className="w-4 h-4"/> {candidateActionLoading[`undo:${cand.id}`] ? 'Returning...' : 'Undo to Previous Stage'}
                  </button>
                )}
                {canManageInterviews && (isInterviewStage || cand.interviewAt) && (
                  <button onClick={() => setSchedulingCandidate(cand)} className={`w-full ${cand.interviewAt ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'} py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5`}>
                    <Calendar className="w-3.5 h-3.5"/> {cand.interviewAt ? 'Reschedule Interview' : 'Schedule Interview'}
                  </button>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleCandidateStatusChange(cand, 'Rejected')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-bold transition-colors">Reject</button>
                  {isShortlistStage ? (
                    <button 
                      onClick={() => handleCandidateStageChange(cand.id, nextStage || 'Interview')}
                      className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition-colors truncate px-2"
                    >
                      Move to {nextStage || 'Interview'}
                    </button>
                  ) : nextStage ? (
                    <button 
                      onClick={() => handleCandidateStageChange(cand.id, nextStage)}
                      disabled={nextStage.toLowerCase().includes('select') && !cand.interviewAt}
                      title={nextStage.toLowerCase().includes('select') && !cand.interviewAt ? "Schedule an interview first" : undefined}
                      className={`flex-[2] ${nextStage.toLowerCase().includes('select') && !cand.interviewAt ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} py-2 rounded-xl text-xs font-bold transition-colors truncate px-2`}
                    >
                      Move to {nextStage}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleCandidateStatusChange(cand, 'Selected')} 
                      disabled={!cand.interviewAt}
                      title={!cand.interviewAt ? "Schedule an interview first" : undefined}
                      className={`flex-[2] ${!cand.interviewAt ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} py-2 rounded-xl text-xs font-bold transition-colors truncate px-2`}
                    >
                      Select Candidate
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  // Positions State
  const [positionsList, setPositionsList] = useState([])


  // Handle file upload — detects file type and routes to proper handler
  const DELIMITED_SPREADSHEET_EXTENSIONS = ['csv', 'tsv', 'txt']
  const EXCEL_SPREADSHEET_EXTENSIONS = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods']
  const SPREADSHEET_EXTENSIONS = [...DELIMITED_SPREADSHEET_EXTENSIONS, ...EXCEL_SPREADSHEET_EXTENSIONS]
  const getFileExt = (file) => (file.name?.split('.').pop() || '').toLowerCase()
  const isResumeFile = (file) => ['pdf', 'docx', 'doc'].includes(getFileExt(file))
  const isSpreadsheetFile = (file) => SPREADSHEET_EXTENSIONS.includes(getFileExt(file))

  const downloadCandidateTemplate = () => {
    const headers = [
      'First Name *', 'Last Name', 'Email *', 'Phone', 'Current Role',
      'Current Company', 'Experience (Years)', 'Current CTC', 'Expected CTC',
      'Notice Period (Days)', 'Skills (comma-separated)', 'Education', 'Location',
      'LinkedIn URL', 'Portfolio URL', 'Resume URL', 'Resume Summary', 'Past Experience',
    ]
    const worksheet = XLSX.utils.aoa_to_sheet([headers])
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(16, Math.min(30, header.length + 4)) }))
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }

    const instructions = XLSX.utils.aoa_to_sheet([
      ['NexaHR AI Candidate Analysis Template'],
      ['Use the Candidate Data sheet to add one candidate per row for the selected open position.'],
      [],
      ['Required fields', 'First Name and Email'],
      ['AI matching fields', 'Current Role, Experience (Years), Skills, Education, Location, Past Experience, Resume Summary'],
      ['Skills format', 'Separate multiple skills with commas, semicolons, pipes, or slashes.'],
      ['Experience format', 'Use a number such as 2 or 4.5.'],
      ['CTC format', 'Use a number or a value such as INR 1200000.'],
      ['Notice period', 'Use the number of days, such as 30 or 60.'],
      ['URLs', 'Use complete URLs beginning with https:// when available.'],
      ['How it works', 'Upload this workbook from the selected position, run AI analysis, review the match score, then save approved candidates to Applied.'],
      [],
      ['Example values are included on the Example sheet only. Do not upload the Example sheet as candidate data.'],
    ])
    instructions['!cols'] = [{ wch: 24 }, { wch: 110 }]

    const example = XLSX.utils.aoa_to_sheet([
      headers,
      ['Aarav', 'Sharma', 'aarav.sharma@example.com', '+91 9876543210', 'Frontend Developer', 'Example Technologies', 2, 600000, 800000, 30, 'React, JavaScript, Next.js', 'B.Tech Computer Science', 'Bengaluru', 'https://linkedin.com/in/example', 'https://example.com', '', 'Frontend developer with 2 years building responsive web applications.', 'Built React dashboards, reusable components, and REST API integrations.'],
    ])
    example['!cols'] = headers.map((header) => ({ wch: Math.max(16, Math.min(30, header.length + 4)) }))
    example['!freeze'] = { xSplit: 0, ySplit: 1 }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidate Data')
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions')
    XLSX.utils.book_append_sheet(workbook, example, 'Example')
    XLSX.writeFile(workbook, 'nexahr-candidate-import-template.xlsx')
  }

  const handleDirectExcelImport = async (inputRows = parsedCandidates) => {
    setAnalysisError(null)
    const rows = inputRows.filter((candidate) => candidate.name?.trim() && candidate.email?.trim())
    if (!rows.length || rows.length !== inputRows.length) {
      setAnalysisError('Every Excel row must contain a candidate name and email before saving.')
      return
    }
    if (!selectedPositionForCandidates?.id) {
      setAnalysisError('Open a position before saving candidates to Applied.')
      return
    }

    setDirectImportSaving(true)
    setCandidatePhase('processing')
    try {
      await candidateApi.bulkApply({
        candidates: rows.map(({ id, score, matchScore, matchLabel, matchedSkills, missingSkills, strengths, concerns, analysisSummary, ...candidate }) => ({
          ...candidate,
          source: 'EXCEL',
        })),
        jobId: selectedPositionForCandidates.id,
        jobTitle: selectedPositionForCandidates.title,
      })
      // The write is already committed. A slow/temporarily unavailable read
      // must not make the user think the import failed or duplicate the rows.
      try {
        await ensureCandidatesLoaded({ force: true, position: selectedPositionForCandidates })
      } catch (refreshError) {
        console.warn('Candidate import succeeded but refresh failed:', refreshError)
      }
      setParsedCandidates([])
      setUploadFileName(null)
      setCandidateImportMode('ai')
      setCandidatePhase('idle')
    } catch (error) {
      setAnalysisError(error.response?.data?.message || error.message || 'Failed to save candidates to Applied.')
      setCandidatePhase('uploaded')
      throw error
    } finally {
      setDirectImportSaving(false)
    }
  }

  const handleFilesUpload = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean)
    if (!files.length) return
    if (files.length === 1) {
      await handleFileUpload(files[0])
      return
    }
    if (!files.every(isResumeFile)) {
      const spreadsheetCount = files.filter(isSpreadsheetFile).length
      setUploadError(spreadsheetCount > 0
        ? 'Bulk upload supports multiple resume files only. Upload one spreadsheet file at a time.'
        : 'Bulk upload supports resume files only. Please upload PDF, DOC, or DOCX resumes together.')
      setCandidatePhase('upload')
      return
    }

    setUploadError(null)
    setAnalysisError(null)
    setUploadFileName(`${files.length} resumes`)
    setCandidatePhase('processing')
    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('resumes', file))
      const response = await candidateApi.uploadBulkDraftResumes(formData)
      const data = response.data?.data || {}
      const candidates = data.candidates || []
      if (!candidates.length) {
        setUploadError('No resumes could be parsed. Please check the files and try again.')
        setCandidatePhase('upload')
        return
      }
      setParsedCandidates(candidates)
      setLocalCandidateStatuses({})
      setCandidateActionLoading({})
      setCandidatePhase('uploaded')
      if (data.failures?.length) {
        setAnalysisError(`${data.failures.length} resume${data.failures.length !== 1 ? 's' : ''} could not be parsed and were skipped.`)
      }
    } catch (err) {
      const failures = err.response?.data?.data?.failures || []
      const failureSummary = failures
        .slice(0, 3)
        .map((failure) => `${failure.fileName || 'Resume'}: ${failure.message || 'Could not parse'}`)
        .join(' | ')
      const remaining = failures.length > 3 ? ` (+${failures.length - 3} more)` : ''
      setUploadError(
        failureSummary
          ? `${failureSummary}${remaining}`
          : (err.response?.data?.message || err.message || 'Failed to upload bulk resumes. Please try again.')
      )
      setCandidatePhase('upload')
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    setUploadError(null)
    setUploadFileName(file.name)
    const ext = getFileExt(file)
    
    if (DELIMITED_SPREADSHEET_EXTENSIONS.includes(ext)) {
      // CSV/TSV/TXT exports: parse as plain text and auto-detect delimiter
      setCandidatePhase('processing')
      try {
        const text = await file.text()
        const candidates = parseCSVToCandidates(text, ext === 'tsv' ? '\t' : null)
        if (candidates.length === 0) {
          setUploadError('No valid candidates found in the spreadsheet. Make sure it has columns like Name, Email, Phone.')
          setCandidatePhase('upload')
          return
        }
        setParsedCandidates(candidates)
        setLocalCandidateStatuses({})
        setCandidateActionLoading({})
        setAnalysisError(null)
        setCandidatePhase('uploaded')
      } catch (err) {
        setUploadError('Failed to read the spreadsheet file. Please check the format and try again.')
        setCandidatePhase('upload')
      }
    } else if (EXCEL_SPREADSHEET_EXTENSIONS.includes(ext)) {
      // Excel: use SheetJS to parse binary format
      setCandidatePhase('processing')
      try {
        if (!XLSX?.read || !XLSX?.utils?.sheet_to_json) {
          throw new Error('Excel parser did not load correctly')
        }
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const candidateSheetName = workbook.SheetNames.find((sheetName) => sheetName.toLowerCase() === 'candidate data')
        const sheetNamesToRead = candidateSheetName
          ? [candidateSheetName]
          : workbook.SheetNames.filter((sheetName) => !['instructions', 'example', 'read me', 'readme'].includes(sheetName.toLowerCase()))
        const sheetData = sheetNamesToRead
          .map((sheetName) => {
            const sheet = workbook.Sheets[sheetName]
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
              .filter((row) => Object.values(row).some((value) => String(value || '').trim()))
            return { sheetName, rows }
          })
          .find((entry) => entry.rows.length > 0)

        // Convert first non-empty sheet to array of objects using header row.
        const jsonRows = sheetData?.rows || []
        if (!jsonRows || jsonRows.length === 0) {
          setUploadError('No data rows found in the Excel file. Please add candidate data below the header row in at least one sheet.')
          setCandidatePhase('upload')
          return
        }
        // Map any column names flexibly to candidate fields
        function flexFind(obj, patterns) {
          const key = Object.keys(obj).find(k => patterns.some(p => k.toLowerCase().includes(p)))
          return key ? String(obj[key] || '').trim() : ''
        }
        const candidates = jsonRows.map((row, i) => {
          const fullName = flexFind(row, ['full name', 'fullname', 'candidate name', 'candidate'])
          const firstName = flexFind(row, ['first name', 'first'])
          const lastName = flexFind(row, ['last name', 'surname', 'last'])
          const name = fullName || [firstName, lastName].filter(Boolean).join(' ')
          const experience = flexFind(row, ['past experience', 'experience summary', 'work history'])
          const resumeSummary = flexFind(row, ['resume summary', 'profile summary', 'summary', 'objective'])
          const education = flexFind(row, ['education', 'degree', 'qualification'])
          return {
            id: `xlsx-${i}`,
            name: name,
            firstName,
            lastName,
            email: flexFind(row, ['email', 'mail']),
            phone: flexFind(row, ['phone', 'mobile', 'contact', 'cell']),
            exp: flexFind(row, ['experience (years)', 'total experience', 'years of experience', 'experience', 'years', 'yrs']) || null,
            totalExperience: flexFind(row, ['experience (years)', 'total experience', 'years of experience']) || null,
            role: flexFind(row, ['role', 'title', 'position', 'designation', 'job']),
            currentCompany: flexFind(row, ['current company', 'company', 'employer']),
            currentDesignation: flexFind(row, ['current designation', 'designation', 'job title']),
            currentCtc: flexFind(row, ['current ctc', 'current salary', 'current compensation']),
            expectedCtcText: flexFind(row, ['expected ctc', 'expected salary', 'expected compensation']),
            noticePeriod: flexFind(row, ['notice period', 'notice']),
            skills: splitList(flexFind(row, ['skill', 'technology', 'tech stack'])),
            education,
            educationText: education,
            location: flexFind(row, ['location', 'city']),
            linkedinUrl: flexFind(row, ['linkedin']),
            portfolioUrl: flexFind(row, ['portfolio', 'personal website']),
            resumeUrl: flexFind(row, ['resume url', 'cv url', 'resume link']),
            resumeSummary,
            experience,
            score: null,
            source: 'EXCEL',
          }
        }).filter(c => c.name || c.email)
        if (candidates.length === 0) {
          setUploadError('No valid candidates found. Make sure the Excel sheet has columns like Name, Email, Phone.')
          setCandidatePhase('upload')
          return
        }
        setParsedCandidates(candidates)
        setLocalCandidateStatuses({})
        setCandidateActionLoading({})
        setAnalysisError(null)
        setCandidatePhase('uploaded')
      } catch (err) {
        console.error('Excel parse error:', err)
        setUploadError('Failed to read the Excel file. Please make sure it is a valid .xlsx, .xls, .xlsm, .xlsb, or .ods file.')
        setCandidatePhase('upload')
      }
    } else if (['pdf', 'docx', 'doc'].includes(ext)) {
      // Resume: upload to backend for AI parsing
      setCandidatePhase('processing')
      try {
        const formData = new FormData()
        formData.append('resume', file)
        const res = await candidateApi.uploadDraftResume(formData)
        const data = res.data.data
        const parsed = data.parsedData
        if (!parsed || data.parsingStatus === 'FAILED') {
          setUploadError(data.errorMessage || 'Resume parsing failed. Please try a different file format (PDF or DOCX).')
          setCandidatePhase('upload')
          return
        }
        // Convert parsed resume data into a candidate row for the results table
        const candidate = {
          id: data.resumeId,
          name: parsed.personal?.name || 'Unknown',
          email: parsed.personal?.email || '',
          phone: parsed.personal?.phone || '',
          exp: parsed.personal?.totalExperience ? `${parsed.personal.totalExperience} Years` : null,
          role: parsed.personal?.currentDesignation || selectedPositionForCandidates?.title || '',
          location: parsed.personal?.currentLocation || '',
          score: null,
          skills: (parsed.skills || []).map(s => s.skillName).slice(0, 10),
          education: (parsed.education || []).map(e => e.degree).slice(0, 3),
          experience: (parsed.experience || []).map(e => `${e.designation || ''} at ${e.companyName || ''}`).slice(0, 3),
          source: 'RESUME',
          draftResumeId: data.resumeId,
          linkedinUrl: parsed.personal?.linkedinUrl || null,
          githubUrl: parsed.personal?.githubUrl || null,
        }
        setParsedCandidates([candidate])
        setLocalCandidateStatuses({})
        setCandidateActionLoading({})
        setAnalysisError(null)
        setCandidatePhase('uploaded')
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to upload resume. Please try again.'
        setUploadError(msg)
        setCandidatePhase('upload')
      }
    } else {
      setUploadError('Unsupported file type. Please upload a resume (PDF, DOC, DOCX) or a spreadsheet (CSV, TSV, XLS, XLSX, XLSM, XLSB, ODS).')
    }
  }

  const handleAnalyzeUploadedCandidates = async () => {
    setAnalysisError(null)
    if (!parsedCandidates.length) {
      setAnalysisError('Please upload candidate data first.')
      return
    }
    if (!selectedPositionForCandidates) {
      setAnalysisError('Please open candidates from an open position before analyzing, so matching can use job details.')
      return
    }

    setCandidatePhase('analyzing')
    try {
      const response = await candidateApi.bulkAnalyze({
        candidates: parsedCandidates,
        jobId: selectedPositionForCandidates.id
      })
      const analyzed = response.data.candidates || response.data.data?.candidates || []
      analyzed.sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0)
        if (scoreDiff !== 0) return scoreDiff
        return (a.name || '').localeCompare(b.name || '')
      })
      
      setParsedCandidates(analyzed)
      setLocalCandidateStatuses({})
      setCandidatePhase('results')
    } catch (error) {
      console.error('Failed to analyze candidates:', error)
      setAnalysisError('AI analysis failed. Please try again.')
      setCandidatePhase('uploaded')
    }
  }

  const handleAddAllToPipeline = async () => {
    setAnalysisError(null)
    const candidatesToImport = parsedCandidates.filter(cand =>
      cand.email && !['Pipeline', 'Rejected'].includes(localCandidateStatuses[cand.email || cand.id])
    )
    if (candidatesToImport.length === 0) return
    const loadingPatch = {}
    candidatesToImport.forEach((cand) => { loadingPatch[cand.email || cand.id] = true })
    setCandidateActionLoading((prev) => ({ ...prev, ...loadingPatch }))
    try {
      const jobId = selectedPositionForCandidates?.id || null;
      await candidateApi.bulkApply({ candidates: candidatesToImport, jobId, jobTitle: selectedPositionForCandidates?.title });
      const newStatuses = {}
      candidatesToImport.forEach(c => { newStatuses[c.email || c.id] = 'Pipeline' })
      setLocalCandidateStatuses((prev) => ({ ...prev, ...newStatuses }))
      await ensureCandidatesLoaded({ force: true })
    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || 'Failed to add candidates to pipeline.')
    } finally {
      setCandidateActionLoading((prev) => {
        const next = { ...prev }
        candidatesToImport.forEach((cand) => { delete next[cand.email || cand.id] })
        return next
      })
    }
  }

  const handleShortlistGoodMatches = async () => {
    setAnalysisError(null)
    const candidatesToShortlist = parsedCandidates.filter(cand => {
      const key = cand.email || cand.id
      return cand.email && (cand.score || 0) >= 70 && !['Pipeline', 'Rejected', 'Shortlisted'].includes(localCandidateStatuses[key])
    })
    if (candidatesToShortlist.length === 0) {
      setAnalysisError('No analyzed candidates at 70% or above are available to shortlist.')
      return
    }
    const loadingPatch = {}
    candidatesToShortlist.forEach((cand) => { loadingPatch[cand.email || cand.id] = true })
    setCandidateActionLoading((prev) => ({ ...prev, ...loadingPatch }))
    try {
      const jobId = selectedPositionForCandidates?.id || null
      await candidateApi.bulkApply({
        candidates: candidatesToShortlist,
        jobId,
        jobTitle: selectedPositionForCandidates?.title,
        shortlist: true,
        minScore: 70,
      })
      const newStatuses = {}
      candidatesToShortlist.forEach(c => { newStatuses[c.email || c.id] = 'Shortlisted' })
      setLocalCandidateStatuses((prev) => ({ ...prev, ...newStatuses }))
      await ensureCandidatesLoaded({ force: true })
    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || 'Failed to shortlist candidates.')
    } finally {
      setCandidateActionLoading((prev) => {
        const next = { ...prev }
        candidatesToShortlist.forEach((cand) => { delete next[cand.email || cand.id] })
        return next
      })
    }
  }

  const handleCandidateStatusChange = async (cand, newStatus) => {
    setAnalysisError(null)
    const actionKey = cand.email || cand.id
    if (candidateActionLoading[actionKey]) return
    
    if (newStatus === 'Rejected') {
      if (!String(cand.id || '').match(/^[0-9a-fA-F]{24}$/)) {
        setLocalCandidateStatuses(prev => ({ ...prev, [actionKey]: newStatus }))
        return
      }
      try {
        setCandidateActionLoading(prev => ({ ...prev, [actionKey]: true }))
        await updateCandidateStatus(cand, 'Rejected')
        setLocalCandidateStatuses(prev => ({ ...prev, [actionKey]: newStatus }))
        void fetchCandidates({ ...candidateFetchParams(), force: true }).catch((error) => {
          console.warn('Candidate refresh after rejection failed:', error)
        })
      } catch (err) {
        setAnalysisError(err.response?.data?.message || err.message || 'Reject failed.')
      } finally {
        setCandidateActionLoading(prev => ({ ...prev, [actionKey]: false }))
      }
    } else if (newStatus === 'Selected') {
      try {
        setCandidateActionLoading(prev => ({ ...prev, [actionKey]: true }))
        await selectCandidate(cand)
        setLocalCandidateStatuses(prev => ({ ...prev, [actionKey]: newStatus }))
        setSelectedOfferCandidate({ ...cand, status: 'Selected' })
        void fetchCandidates({ ...candidateFetchParams(), force: true }).catch((error) => {
          console.warn('Candidate refresh after selection failed:', error)
        })
      } catch (err) {
        setAnalysisError(err.response?.data?.message || err.message || 'Selection failed.')
      } finally {
        setCandidateActionLoading(prev => ({ ...prev, [actionKey]: false }))
      }
    } else if (newStatus === 'Pipeline') {
      try {
        setCandidateActionLoading(prev => ({ ...prev, [actionKey]: true }))

        // Candidates returned by the AI upload flow do not have an application
        // yet. Create the candidate/application and attach it to the selected
        // job before refreshing the pipeline. Existing board rows already have
        // an application id and should use the normal restore transition.
        const hasExistingApplication = candidatesData.some((item) => (
          String(item.id || '') === String(cand.id || '')
          || String(item.applicationId || '') === String(cand.applicationId || '')
        ))
        if (!hasExistingApplication) {
          const jobId = selectedPositionForCandidates?.id || selectedPositionForCandidates?._id
          if (!jobId) throw new Error('Select an open position before adding candidates to the pipeline.')
          await candidateApi.bulkApply({
            candidates: [cand],
            jobId,
            jobTitle: selectedPositionForCandidates?.title,
          })
        } else {
          if (!String(cand.id || '').match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error('This candidate is missing a valid application ID. Refresh the recruitment page and try again.')
          }
          await updateCandidateStatus(cand, 'Pipeline')
        }
        setLocalCandidateStatuses(prev => ({ ...prev, [actionKey]: newStatus }))
        await ensureCandidatesLoaded({ force: true, position: selectedPositionForCandidates })
      } catch (err) {
        setAnalysisError(err.response?.data?.message || err.message || 'Failed to restore candidate to pipeline.')
      } finally {
        setCandidateActionLoading(prev => ({ ...prev, [actionKey]: false }))
      }
    }
  }

  const hydratePosition = async (position) => {
    const response = await jobApi.get(position.id, { timeout: 15000 })
    const fullJob = response.data?.data || response.data
    return {
      ...position,
      description: fullJob.jobSummary || '',
      responsibilities: fullJob.responsibilities || '',
      requiredSkills: fullJob.requiredQualifications || '',
      preferredSkills: fullJob.preferredQualifications || '',
      experience: fullJob.minExperience ? `${fullJob.minExperience}+ Years` : '',
      education: fullJob.minEducation || fullJob.preferredEducation || fullJob.education || '',
      pipelineStages: fullJob.pipelineStages || [],
    }
  }

  const handlePositionDetailsOpen = async (position) => {
    setSelectedPosition(position)
    try {
      const hydratedPosition = await hydratePosition(position)
      setSelectedPosition((current) => current?.id === position.id ? hydratedPosition : current)
    } catch (error) {
      setPositionActionError(error.response?.data?.message || error.message || 'Unable to load position details.')
    }
  }

  const handlePositionEditOpen = async (position) => {
    setEditingPositionForModal(position)
    setShowOpenPositionModal(true)
    try {
      const hydratedPosition = await hydratePosition(position)
      setEditingPositionForModal((current) => current?.id === position.id ? hydratedPosition : current)
    } catch (error) {
      setPositionActionError(error.response?.data?.message || error.message || 'Unable to load position details for editing.')
    }
  }

  const handleSavePosition = async (form, { close = true } = {}) => {
    try {
      const experienceNumbers = [...String(form.experience || '').matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]))
      const minExperience = experienceNumbers[0]
      const maxExperience = experienceNumbers[1] ?? experienceNumbers[0]
      const payload = {
        jobTitle: form.title,
        department: form.departmentId && form.departmentId.match(/^[0-9a-fA-F]{24}$/) ? form.departmentId : undefined,
        totalOpenings: parseInt(form.openings, 10) || 1,
        employmentType: form.jobType === 'Full-time' ? 'FULL_TIME' : form.jobType === 'Part-time' ? 'PART_TIME' : form.jobType === 'Contract' ? 'CONTRACT' : form.jobType === 'Intern' ? 'INTERN' : undefined,
        workMode: form.workMode === 'On-site' ? 'ONSITE' : form.workMode === 'Hybrid' ? 'HYBRID' : form.workMode === 'Remote' ? 'REMOTE' : undefined,
        location: form.locationId && form.locationId.match(/^[0-9a-fA-F]{24}$/) ? form.locationId : undefined,
        jobSummary: form.description,
        responsibilities: form.responsibilities,
        requiredQualifications: form.requiredSkills,
        preferredQualifications: form.preferredSkills,
        minExperience: Number.isFinite(minExperience) ? minExperience : undefined,
        maxExperience: Number.isFinite(maxExperience) ? maxExperience : undefined,
        minEducation: form.education || undefined,
        benefits: form.benefits || undefined,
        internalMinCtc: form.salaryMin ? parseInt(form.salaryMin) : undefined,
        internalMaxCtc: form.salaryMax ? parseInt(form.salaryMax) : undefined,
        currency: form.currency || 'INR',
        hiringManager: form.hiringManagerId && form.hiringManagerId.match(/^[0-9a-fA-F]{24}$/) ? form.hiringManagerId : undefined,
        recruiter: form.recruiterId && form.recruiterId.match(/^[0-9a-fA-F]{24}$/) ? form.recruiterId : undefined,
        openingDate: form.openingDate || undefined,
        targetClosingDate: form.targetClosingDate || undefined,
        expectedJoiningDate: form.expectedJoiningDate || undefined,
        status: form.status === 'Open' ? 'OPEN' : form.status === 'Draft' ? 'DRAFT' : form.status === 'On Hold' ? 'PAUSED' : form.status === 'Closed' ? 'CLOSED' : form.status === 'Cancelled' ? 'CANCELLED' : 'DRAFT'
      }

      if (editingPositionForModal) {
        await jobApi.update(editingPositionForModal.id, payload)
      } else {
        await jobApi.create(payload)
      }
      if (close) {
        setShowOpenPositionModal(false)
        setEditingPositionForModal(null)
      }
      await fetchPositions({ force: true })
    } catch (e) {
      console.error('Failed to save position:', e)
      const fieldErrors = e.response?.data?.data?.errors || e.response?.data?.errors
      const details = fieldErrors && typeof fieldErrors === 'object'
        ? Object.values(fieldErrors).filter(Boolean).join(' ')
        : ''
      setPositionActionError(details || e.response?.data?.message || e.message || 'Failed to save position.')
    }
  }

  const handleDeletePosition = (id) => {
    const pos = positionsList.find(p => p.id === id)
    if (!pos || ['Closed', 'Cancelled'].includes(pos.status)) {
      setPositionActionError('Closed or cancelled positions cannot be cancelled again.')
      return
    }
    setPositionActionError(null)
    setPositionToDelete(pos)
  }

  const handleStatusChange = async (id, newStatus) => {
    const position = positionsList.find((item) => item.id === id)
    if (!position) return
    setPositionActionError(null)
    setPositionActionLoading(true)
    try {
      if (newStatus === 'Active') {
        if (position.status === 'Draft') await jobApi.open(id)
        else await jobApi.reopen(id)
      } else if (newStatus === 'On Hold') {
        await jobApi.pause(id, 'Paused from recruitment positions list')
      } else if (newStatus === 'Closed') {
        await jobApi.close(id, 'Closed from recruitment positions list', false)
      }
      await fetchPositions({ force: true })
      setPositionActionError(null)
    } catch (error) {
      console.error('Failed to change position status:', error)
      const validationErrors = error.response?.data?.data?.errors || error.response?.data?.errors
      const details = validationErrors && typeof validationErrors === 'object'
        ? Object.values(validationErrors).filter(Boolean).join(' ')
        : ''
      setPositionActionError(details || error.response?.data?.message || error.message || 'Failed to update position status.')
    } finally {
      setPositionActionLoading(false)
    }
  }

  // KPI State
  const [activeKpi, setActiveKpi] = useState('positions')
  const [activeCandidateKpi, setActiveCandidateKpi] = useState('all')
  const [candidateDateFilter, setCandidateDateFilter] = useState('all')

  // Dynamic Candidate Stats
  const isCandidateWithinDateFilter = (candidate) => {
    if (candidateDateFilter === 'all') return true
    const activityDates = [
      candidate.appliedAt,
      candidate.stageEnteredAt,
      candidate.shortlistedAt,
      candidate.interviewAt,
      candidate.latestInterview?.date,
      candidate.selectedAt,
      candidate.offerSentAt,
    ]
      .map((value) => new Date(value || 0))
      .filter((value) => !Number.isNaN(value.getTime()) && value.getTime() > 0)
    const date = activityDates.length ? new Date(Math.max(...activityDates.map((value) => value.getTime()))) : null
    if (!date || Number.isNaN(date.getTime())) return false

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    if (candidateDateFilter === 'today') return date >= startOfToday
    if (candidateDateFilter === 'yesterday') return date >= startOfYesterday && date < startOfToday
    if (candidateDateFilter === 'week') {
      const startOfWeek = new Date(startOfToday)
      const day = startOfWeek.getDay()
      startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1))
      return date >= startOfWeek
    }
    if (candidateDateFilter === 'month') return date >= new Date(now.getFullYear(), now.getMonth(), 1)
    if (candidateDateFilter === 'sixMonths') {
      const sixMonthsAgo = new Date(startOfToday)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      return date >= sixMonthsAgo
    }
    return true
  }

  const boardCandidates = Array.from(
    new Map(
      allCandidatesData
        .filter((candidate) => belongsToSelectedPosition(candidate) && isCandidateWithinDateFilter(candidate))
        .map((candidate) => [String(candidate.id), candidate])
    ).values()
  )
  // Keep all board/KPI render paths on the same filtered source so counts and cards stay consistent.
  const candidatesData = boardCandidates
  const positionCandidates = candidatesData
  const pipelineVisibleStatuses = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral', 'Selected', 'Offered', 'HIRED']
  const candidateBelongsToPipelineStage = (candidate, stage) => {
    if (!pipelineVisibleStatuses.includes(candidate.status)) return false
    const stageName = String(stage?.name || '')
    const stageLower = stageName.toLowerCase()
    const stageCategory = String(stage?.category || '').toUpperCase()
    const candidateCategory = String(getCandidateStageCategory(candidate) || '').toUpperCase()
    const isHiredStage = stageCategory === 'HIRED' || /hired|joined/.test(stageLower)
    const isOfferStage = stageCategory === 'OFFER' || /offer/.test(stageLower)
    const isSelectedStage = stageCategory === 'SELECTED' || /select/.test(stageLower)
    const isInterviewStage = stageCategory === 'INTERVIEW' || /interview|technical|round/.test(stageLower)

    // Terminal lifecycle state is authoritative. A candidate can retain the
    // old stage id after an offer is accepted, but must render in exactly one
    // lane and never show onboarding actions in Offered and Hired together.
    if (candidate.status === 'HIRED' || /hired|joined/.test(String(candidate.stage || '').toLowerCase())) {
      return isHiredStage
    }
    if (candidate.status === 'Offered') return isOfferStage
    if (candidate.status === 'Selected') return isSelectedStage
    // Stage identity is the fallback for active candidates. Names are
    // editable and may repeat in custom pipelines.
    if (candidate.stageId && stage?._id) return String(candidate.stageId) === String(stage._id)
    if (isHiredStage || isOfferStage || isSelectedStage) return false
    if (isInterviewStage && candidateCategory === 'INTERVIEW') return true
    return candidate.stage === stageName
  }
  const isInterviewCandidate = (candidate) => {
    const activeStatuses = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral']
    const category = String(getCandidateStageCategory(candidate) || '').toUpperCase()
    return activeStatuses.includes(candidate.status) && (
      category === 'INTERVIEW'
      || /interview|technical|round/i.test(String(candidate.stage || ''))
    )
  }
  const isAppliedCandidate = (candidate) => {
    const activeStatuses = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral']
    const category = String(getCandidateStageCategory(candidate) || '').toUpperCase()
    return activeStatuses.includes(candidate.status)
      && !isInterviewCandidate(candidate)
      && (category === 'APPLIED' || category === 'SCREENING' || candidate.stage === 'Screening' || candidate.stage === 'Applied' || candidate.stage === 'AI Match' || !candidate.stage)
  }
  const candidateStats = {
    total: positionCandidates.length,
    applied: positionCandidates.filter(isAppliedCandidate).length,
    interviewing: positionCandidates.filter(isInterviewCandidate).length,
    selected: positionCandidates.filter(c => c.status === 'Selected').length,
    rejected: positionCandidates.filter(c => c.status === 'Rejected').length,
    referral: positionCandidates.filter(c => c.status === 'Referral').length,
  }
  const getCandidateStageLabel = (candidate) => candidate.interviewRoundName || candidate.stage || 'Applied'
  const getCandidateOffer = (candidate) => offersList.find(o => o.id === candidate.id)
  const formatCandidateDate = (value, fallback = 'Pending') => {
    if (!value) return fallback
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return fallback
    return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
  }
  const getFocusedCandidates = () => {
    if (activeCandidateKpi === 'applied') return positionCandidates.filter(isAppliedCandidate)
    if (activeCandidateKpi === 'interviewing') return positionCandidates.filter(isInterviewCandidate)
    if (activeCandidateKpi === 'selected') return positionCandidates.filter(c => c.status === 'Selected')
    if (activeCandidateKpi === 'rejected') return positionCandidates.filter(c => c.status === 'Rejected')
    if (activeCandidateKpi === 'referral') return positionCandidates.filter(c => c.status === 'Referral')
    return positionCandidates
  }
  const renderCandidateTableActions = (candidate) => {
    const stageLower = String(candidate.stage || '').toLowerCase()
    const stageCategory = getCandidateStageCategory(candidate)
    const isRejected = candidate.status === 'Rejected' || candidate.status === 'REJECTED'
    const isHiredStage = candidate.status !== 'Offered' && (candidate.status === 'HIRED' || candidate.offerStatus === 'Accepted' || stageCategory === 'HIRED' || stageLower.includes('hired'))
    const isOfferStage = !isHiredStage && (stageCategory === 'OFFER' || stageLower.includes('offer') || candidate.status === 'Offered')
    const isSelectedStage = !isHiredStage && !isOfferStage && (stageCategory === 'SELECTED' || stageLower.includes('select') || candidate.status === 'Selected')
    const isInterviewStage = !isRejected && !isHiredStage && !isOfferStage && !isSelectedStage && (stageCategory === 'INTERVIEW' || !!candidate.interviewAt || stageLower.includes('interview') || stageLower.includes('round'))
    const isShortlistStage = !isRejected && !isHiredStage && !isOfferStage && !isSelectedStage && !isInterviewStage && (stageCategory === 'SCREENING' || stageLower.includes('shortlist') || stageLower.includes('screen'))
    const isAppliedStage = !isRejected && !isHiredStage && !isOfferStage && !isSelectedStage && !isShortlistStage && !isInterviewStage
    const offer = getCandidateOffer(candidate)

    if (isRejected) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => handleCandidateStatusChange(candidate, 'Pipeline')} disabled={candidateActionLoading[candidate.email || candidate.id]} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Restore
          </button>
          <button onClick={() => handleRejectedCandidateDelete(candidate)} disabled={candidateActionLoading[`delete:${candidate.id}`]} title="Delete rejected application" aria-label={`Delete ${candidate.name || 'rejected application'}`} className="inline-flex items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }

    if (isHiredStage) {
      return <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Ready for onboarding</span>
    }

    if (isOfferStage || isSelectedStage) {
      const offerAlreadySent = ['Sent', 'Accepted', 'Rejected'].includes(offer?.offerStatus)
      const selectionApprovalPending = candidate.selectionStatus === 'SELECTION_APPROVAL_PENDING'
      if (!offerAlreadySent && selectionApprovalPending) {
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => requestCandidateUndo(candidate)} disabled={candidateActionLoading[`undo:${candidate.id}`]} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
              {candidateActionLoading[`undo:${candidate.id}`] ? 'Returning...' : 'Undo Selection'}
            </button>
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Selection approval pending</span>
          </div>
        )
      }
      if (!offer || !offer.offerStatus || offer.offerStatus === 'Draft') {
        return (
          <div className="flex flex-wrap justify-end gap-2">
            {isSelectedStage && (
              <button onClick={() => requestCandidateUndo(candidate)} disabled={candidateActionLoading[`undo:${candidate.id}`]} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
                {candidateActionLoading[`undo:${candidate.id}`] ? 'Returning...' : 'Undo Selection'}
              </button>
            )}
            <button onClick={() => setSelectedOfferCandidate(candidate)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-700">
              Create Offer
            </button>
          </div>
        )
      }
      if (offer.offerStatus === 'Sent') {
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => handleOfferDecision(candidate, 'reject')} disabled={candidateActionLoading[`offer:${candidate.id}`]} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
              Declined
            </button>
            <button onClick={() => handleOfferDecision(candidate, 'accept')} disabled={candidateActionLoading[`offer:${candidate.id}`]} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
              Accepted
            </button>
            <button onClick={() => requestCandidateUndo(candidate)} disabled={candidateActionLoading[`undo:${candidate.id}`]} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
              {candidateActionLoading[`undo:${candidate.id}`] ? 'Returning...' : 'Undo'}
            </button>
          </div>
        )
      }
      if (offer.offerStatus === 'Accepted') {
        return <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Ready for onboarding</span>
      }
      return <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">Offer declined</span>
    }

    if (isShortlistStage) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => requestCandidateUndo(candidate)} disabled={candidateActionLoading[`undo:${candidate.id}`]} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
            {candidateActionLoading[`undo:${candidate.id}`] ? 'Returning...' : 'Undo'}
          </button>
          {canManageInterviews && <button onClick={() => setSchedulingCandidate(candidate)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100">
            Schedule Interview
          </button>}
          <button onClick={() => handleCandidateStageChange(candidate.id, 'Interview')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
            Move to Interview
          </button>
          <button onClick={() => handleCandidateStatusChange(candidate, 'Rejected')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100">
            Reject
          </button>
        </div>
      )
    }

    if (isInterviewStage) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => requestCandidateUndo(candidate)} disabled={candidateActionLoading[`undo:${candidate.id}`]} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
            {candidateActionLoading[`undo:${candidate.id}`] ? 'Returning...' : 'Undo'}
          </button>
          {canManageInterviews && <button onClick={() => setSchedulingCandidate(candidate)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100">
            {candidate.interviewAt ? 'Reschedule' : 'Schedule'}
          </button>}
          <button onClick={() => handleCandidateStatusChange(candidate, 'Rejected')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100">
            Reject
          </button>
          <button onClick={() => handleCandidateStatusChange(candidate, 'Selected')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
            Select Candidate
          </button>
        </div>
      )
    }

    if (isAppliedStage) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => handleCandidateStatusChange(candidate, 'Rejected')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100">
            Reject
          </button>
          {canManageInterviews && <button onClick={() => setSchedulingCandidate(candidate)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100">
            Schedule
          </button>}
          <button onClick={() => handleCandidateStageChange(candidate.id, 'Shortlisted')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
            Shortlist
          </button>
        </div>
      )
    }

    return (
      <button onClick={() => setSelectedCandidateInfo(candidate)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
        View
      </button>
    )
  }
  const shouldShowCandidateSection = (section) => {
    if (activeCandidateKpi === 'all') return section !== 'referral'
    if (activeCandidateKpi === 'referral') return section === 'referral'
    return activeCandidateKpi === section
  }
  const candidateBoardGridClass = activeCandidateKpi === 'all'
    ? 'flex overflow-x-auto gap-6 pb-4 snap-x hide-scrollbar'
    : 'grid grid-cols-1 gap-6'

  useEffect(() => {
    if (!positionPickerOpen) return undefined
    const handleOutsideClick = (event) => {
      if (!positionPickerRef.current?.contains(event.target)) setPositionPickerOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [positionPickerOpen])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-500" /> Recruitment
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage job openings and candidate pipeline</p>
        </div>
        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          {activeTab === 'candidates' && selectedPositionForCandidates && (
            <div ref={positionPickerRef} className="relative min-w-0 flex-1 sm:min-w-[280px] sm:flex-none">
              <button
                type="button"
                onClick={() => setPositionPickerOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={positionPickerOpen}
                className={`group flex w-full items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 text-left shadow-sm transition-all dark:bg-slate-900 ${positionPickerOpen ? 'border-indigo-500 ring-4 ring-indigo-100 dark:border-indigo-400 dark:ring-indigo-500/20' : 'border-indigo-200 hover:border-indigo-400 hover:shadow-md dark:border-indigo-500/30'}`}
              >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Open position</span>
                <span className="mt-0.5 block truncate text-sm font-bold text-slate-800 dark:text-white">{selectedPositionForCandidates.title}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-indigo-500 transition-transform ${positionPickerOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {positionPickerOpen && (
                <div role="listbox" aria-label="Open positions" className="absolute right-0 z-50 mt-2 max-h-72 w-full min-w-[280px] overflow-y-auto rounded-2xl border border-indigo-100 bg-white p-1.5 shadow-xl shadow-indigo-900/10 dark:border-slate-700 dark:bg-slate-900">
                  {positionsList.filter((position) => !['Closed', 'Cancelled'].includes(position.status)).map((position) => {
                    const isSelected = String(position.id) === String(selectedPositionForCandidates.id)
                    return (
                      <button
                        key={position.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setPositionPickerOpen(false)
                          handlePositionSelection(position.id)
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                          <Briefcase className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{position.title}</span>
                          <span className="block truncate text-[11px] font-medium text-slate-400">{position.department || 'Department not set'}{position.location ? ` - ${position.location}` : ''}</span>
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {isAdmin && activeTab === 'positions' && (
            <button 
              onClick={() => {
                setEditingPositionForModal(null)
                setShowOpenPositionModal(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Open Position
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center gap-2 whitespace-nowrap pb-4 border-b-2 font-medium text-sm transition-colors outline-none select-none ${
              activeTab === 'positions' || activeTab === 'candidates'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Open Positions
          </button>
        </nav>
      </div>

      {activeTab === 'positions' ? (
        <div className="space-y-6">
          {positionActionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {positionActionError}
            </div>
          )}
          {/* KPI Boxes */}
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {[
              { id: 'positions', label: 'Open Positions', value: positionsLoading ? '...' : positionsList.filter(p => !['Closed', 'Cancelled'].includes(p.status)).length.toString(), icon: Briefcase, colorClass: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' },
              { id: 'closed', label: 'Closed Positions', value: positionsLoading ? '...' : positionsList.filter(p => p.status === 'Closed').length.toString(), icon: Briefcase, colorClass: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30' },
            ].map(kpi => {
              const Icon = kpi.icon
              const isActive = activeKpi === kpi.id
              
              return (
                <div 
                  key={kpi.id}
                  onClick={() => setActiveKpi(kpi.id)}
                  className={`rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-pointer transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white dark:bg-slate-900 border-2 border-indigo-400 shadow-lg ring-2 ring-indigo-400/20 transform scale-[1.02]' 
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-lg transition-transform group-hover:scale-110 duration-300 ${isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/40' : kpi.colorClass}`}>
                    <Icon className="w-5 h-5 drop-shadow-md" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{kpi.label}</p>
                    <h3 className={`text-2xl font-bold transition-colors ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>{kpi.value}</h3>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detailed Data Table based on Active KPI */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                {activeKpi === 'positions' ? 'Open Positions List' : 'Closed Positions List'}
              </h2>
            </div>

            {positionsError && (
              <div className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                <span>{positionsError}</span>
                <button type="button" onClick={() => fetchPositions({ force: true })} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">Retry</button>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs border-y border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Position Details</th>
                    <th className="px-6 py-4">Department & Location</th>
                    <th className="px-6 py-4">Budget & Openings</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {positionsLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={`position-skeleton-${idx}`} className="animate-pulse">
                        <td className="px-6 py-5"><div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" /></td>
                        <td className="px-6 py-5"><div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" /></td>
                        <td className="px-6 py-5"><div className="h-7 w-20 rounded-full bg-slate-200 dark:bg-slate-700" /></td>
                        <td className="px-6 py-5 text-right"><div className="ml-auto h-8 w-28 rounded bg-slate-200 dark:bg-slate-700" /></td>
                      </tr>
                    ))
                  ) : positionsList.filter(p => activeKpi === 'positions' ? !['Closed', 'Cancelled'].includes(p.status) : p.status === 'Closed').map(pos => (
                    <tr 
                      key={pos.id} 
                      onClick={async (e) => {
                        if (e.target.closest('button')) return;
                        await handlePositionSelection(pos.id)
                      }}
                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group cursor-pointer"
                    >
                      
                      {/* Column 1: ID, Title, Job Type */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {pos.title ? pos.title.substring(0, 2).toUpperCase() : 'JB'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {pos.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {pos.jobType || 'Full-time'}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {pos.employmentType || 'Permanent'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Department & Location */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{pos.department || 'General'}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <MapPin className="w-3 h-3"/> {pos.location || 'Remote'} ({pos.workMode || 'Remote'})
                        </div>
                      </td>

                      {/* Column 3: Budget & Openings */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500"/> 
                          {pos.salaryMin && pos.salaryMax ? `${pos.currency || '$'}${pos.salaryMin} - ${pos.salaryMax}` : 'Standard'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 font-semibold">
                          <Users className="w-3 h-3 text-blue-500"/> {pos.openings || 1} Openings
                        </div>
                      </td>

                      {/* Column 4: Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${
                          pos.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
                          pos.status === 'Closed' ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20'
                        }`}>
                          {pos.status === 'Active' ? '● OPEN' : pos.status === 'Closed' ? '● CLOSED' : '● ON HOLD'}
                        </span>
                      </td>

                      {/* Column 5: Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && (
                            <>
                              {pos.status !== 'Active' && (
                                <button disabled={positionActionLoading} onClick={() => handleStatusChange(pos.id, 'Active')} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50" title="Mark as Active"><PlayCircle className="w-4 h-4" /></button>
                              )}
                              {pos.status === 'Active' && (
                                <button disabled={positionActionLoading} onClick={() => handleStatusChange(pos.id, 'On Hold')} className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50" title="Put On Hold"><PauseCircle className="w-4 h-4" /></button>
                              )}
                              {['Active', 'On Hold'].includes(pos.status) && (
                                <button disabled={positionActionLoading} onClick={() => handleStatusChange(pos.id, 'Closed')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50" title="Close Position"><PowerOff className="w-4 h-4" /></button>
                              )}
                              <button onClick={() => setPublishingPosition(pos)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="Publish Job"><Globe className="w-4 h-4" /></button>
                              <button onClick={() => handlePositionEditOpen(pos)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" title="Edit Position"><Edit className="w-4 h-4" /></button>
                              {!['Closed', 'Cancelled'].includes(pos.status) && (
                                <button disabled={positionActionLoading} onClick={() => handleDeletePosition(pos.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50" title="Cancel Position"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </>
                          )}
                          <button 
                            onClick={() => handlePositionDetailsOpen(pos)}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ml-2"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!positionsLoading && positionsList.filter(p => activeKpi === 'positions' ? !['Closed', 'Cancelled'].includes(p.status) : p.status === 'Closed').length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        No positions found in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      ) : activeTab === 'candidates' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">

          {selectedPositionForCandidates && (
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Candidates for: {selectedPositionForCandidates.title}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {candidatePhase !== 'upload' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openAllCandidates}
                      disabled={allCandidatesLoading}
                      className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                      title="Show candidates across all open positions"
                    >
                      <Users className="w-4 h-4" /> Show All Candidates
                    </button>
                    <button
                      onClick={() => setShowCandidateSpreadsheetEditor(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Import Excel
                    </button>
                    <button 
                      onClick={() => { setCandidateImportMode('ai'); setCandidatePhase('upload') }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
                    >
                      <UploadCloud className="w-4 h-4" /> Upload Candidate Data
                    </button>
                    <button 
                      onClick={() => setShowManualCandidateModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <UserPlus className="w-4 h-4" /> Add Candidate Manually
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => {
                    setSelectedPositionForCandidates(null)
                    setActiveTab('positions')
                  }}
                  className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all border border-indigo-100 dark:border-slate-700"
                >
                  Back to Open Positions
                </button>
              </div>
            </div>
          )}

          {candidatePhase === 'idle' && (
            <div className="space-y-6">
              <div className="flex gap-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
                {(() => {
                  let kpiList = []
                  if (selectedPositionForCandidates && selectedPositionForCandidates.pipelineStages && selectedPositionForCandidates.pipelineStages.length > 0) {
                    const activeStages = selectedPositionForCandidates.pipelineStages.filter(s => s.isActive !== false).sort((a, b) => a.order - b.order)
                    kpiList = activeStages.map(stage => {
                      const count = candidatesData.filter((candidate) => candidateBelongsToPipelineStage(candidate, stage)).length
                      
                      let Icon = Users
                      let colorClass = 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30'
                      if (stage.category === 'SCREENING') { Icon = FileText; colorClass = 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/30' }
                      else if (stage.category === 'INTERVIEW' || stage.category === 'ASSESSMENT') { Icon = Calendar; colorClass = 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' }
                      else if (stage.category === 'SELECTED' || stage.category === 'OFFER' || stage.category === 'HIRED') { Icon = CheckCircle2; colorClass = 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30' }
                      
                      return { id: stage.name, label: stage.name, value: count.toString(), icon: Icon, colorClass }
                    })
                    const rejectedCount = candidatesData.filter(c => belongsToSelectedPosition(c) && c.status === 'Rejected').length
                    kpiList.push({ id: 'rejected', label: 'Rejected', value: rejectedCount.toString(), icon: Trash2, colorClass: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/30' })
                  } else {
                    kpiList = [
                      { id: 'applied', label: 'Applied', value: candidateStats.applied.toString(), icon: Users, colorClass: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' },
                      { id: 'interviewing', label: 'Interviewing', value: candidateStats.interviewing.toString(), icon: Calendar, colorClass: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' },
                      { id: 'selected', label: 'Selected', value: candidateStats.selected.toString(), icon: CheckCircle2, colorClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30' },
                      { id: 'rejected', label: 'Rejected', value: candidateStats.rejected.toString(), icon: Trash2, colorClass: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/30' },
                      { id: 'referral', label: 'Referrals', value: candidateStats.referral.toString(), icon: UserPlus, colorClass: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30' },
                    ]
                  }
                  
                  return kpiList.map(kpi => {
                    const Icon = kpi.icon
                    const isActive = activeCandidateKpi === kpi.id

                    return (
                      <div 
                        key={kpi.id}
                        onClick={() => setActiveCandidateKpi(isActive ? 'all' : kpi.id)}
                        className={`cursor-pointer rounded-2xl p-3 border shadow-sm flex items-center gap-2 transition-all duration-300 group flex-1 min-w-0 ${
                          isActive
                            ? 'bg-white dark:bg-slate-900 border-indigo-400 shadow-lg ring-2 ring-indigo-400/20 transform scale-[1.02] z-10' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md hover:-translate-y-1'
                        }`}
                      >
                        <div className={`w-8 h-8 xl:w-10 xl:h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-md transition-transform group-hover:scale-110 duration-300 ${isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/40' : kpi.colorClass}`}>
                          <Icon className="w-4 h-4 xl:w-5 xl:h-5 drop-shadow-md" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className={`text-[9px] xl:text-xs font-bold uppercase tracking-wider mb-0.5 xl:mb-1 truncate transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{kpi.label}</p>
                          <h3 className={`text-lg xl:text-2xl font-bold truncate transition-colors ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>{kpi.value}</h3>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Kanban Pipeline Board */}
              <div className="bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
                <div className="flex items-center justify-between mb-6 gap-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeCandidateKpi === 'all' && 'Candidate Pipeline Board'}
                    {activeCandidateKpi === 'applied' && 'Applied Candidates'}
                    {activeCandidateKpi === 'interviewing' && 'Interview Candidates Pipeline'}
                    {activeCandidateKpi === 'selected' && 'Selected Candidates Pipeline'}
                    {activeCandidateKpi === 'rejected' && 'Rejected Candidates Pipeline'}
                    {activeCandidateKpi === 'referral' && 'Referrals Pipeline'}
                  </h2>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <span className="sr-only">Filter candidates by date</span>
                      <span className="text-slate-400" aria-hidden="true"><Calendar className="h-4 w-4" /></span>
                      <select
                        value={candidateDateFilter}
                        onChange={(event) => setCandidateDateFilter(event.target.value)}
                        className="bg-transparent text-sm font-semibold text-slate-700 outline-none dark:text-slate-200"
                        aria-label="Filter candidates by date"
                      >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="sixMonths">Last 6 Months</option>
                        <option value="all">All Time</option>
                      </select>
                    </label>
                    {activeCandidateKpi !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setActiveCandidateKpi('all')}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        Show All Sections
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <CandidateBoardSkeleton />
                ) : activeCandidateKpi !== 'all' ? (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                          <tr>
                            <th className="px-5 py-4">Candidate</th>
                            <th className="px-5 py-4">Current Stage</th>
                            <th className="px-5 py-4">Applied</th>
                            <th className="px-5 py-4">Interview</th>
                            <th className="px-5 py-4">Offer</th>
                            <th className="px-5 py-4">Match</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {getFocusedCandidates().map((candidate) => {
                            const offer = getCandidateOffer(candidate)
                            return (
                              <tr key={candidate.id} className="group transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5">
                                <td className="px-5 py-4">
                                  <button type="button" onClick={() => setSelectedCandidateInfo(candidate)} className="text-left">
                                    <div className="font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{candidate.name}</div>
                                    <div className="mt-1 text-xs font-medium text-slate-500">{candidate.role || selectedPositionForCandidates?.title || 'Candidate'}</div>
                                    {candidate.phone && (
                                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                        <Phone className="h-3 w-3" /> {candidate.phone}
                                      </div>
                                    )}
                                  </button>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {getCandidateStageLabel(candidate)}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                  {formatCandidateDate(candidate.appliedAt, '-')}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatInterviewSchedule(candidate) || 'Pending'}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                    offer?.offerStatus === 'Accepted'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : offer?.offerStatus === 'Sent'
                                        ? 'bg-amber-50 text-amber-700'
                                        : offer?.offerStatus === 'Rejected'
                                          ? 'bg-red-50 text-red-700'
                                          : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {offer?.offerStatus || 'Not created'}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">
                                    <Sparkles className="h-3 w-3" /> {Math.round(candidate.score || 0)}%
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  {renderCandidateTableActions(candidate)}
                                </td>
                              </tr>
                            )
                          })}
                          {getFocusedCandidates().length === 0 && (
                            <tr>
                              <td colSpan="7" className="px-5 py-14 text-center">
                                <div className="mx-auto flex max-w-sm flex-col items-center">
                                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                                    <Users className="h-6 w-6" />
                                  </div>
                                  <p className="font-bold text-slate-700 dark:text-slate-200">No candidates found here</p>
                                  <p className="mt-1 text-sm text-slate-500">Try another KPI or upload/add candidates for this position.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                <div className={candidateBoardGridClass}>
                  {(() => {
                    if (selectedPositionForCandidates && selectedPositionForCandidates.pipelineStages && selectedPositionForCandidates.pipelineStages.length > 0) {
                      const activeStages = selectedPositionForCandidates.pipelineStages.filter(s => s.isActive !== false).sort((a, b) => a.order - b.order)
                      
                      const columns = activeStages.map((stage, i) => {
                        if (!shouldShowCandidateSection(stage.name)) return null;
                        
                        const stageCandidates = candidatesData.filter((candidate) => candidateBelongsToPipelineStage(candidate, stage))
                        
                        let dotColor = 'bg-blue-400'
                        let bgClass = 'bg-slate-50 dark:bg-slate-900/50'
                        let borderClass = 'border-slate-200 dark:border-slate-800'
                        let textClass = 'text-slate-500 dark:text-slate-400'
                        let badgeBg = 'bg-white dark:bg-slate-800'
                        let badgeText = 'text-slate-600 dark:text-slate-300'
                        let badgeBorder = 'border-slate-100 dark:border-slate-700'
                        
                        if (stage.category === 'SCREENING') {
                          dotColor = 'bg-purple-500'
                          bgClass = 'bg-purple-50/50 dark:bg-purple-900/10'
                          borderClass = 'border-purple-100 dark:border-purple-900/30'
                          textClass = 'text-purple-600 dark:text-purple-400'
                          badgeText = 'text-purple-700 dark:text-purple-300'
                          badgeBorder = 'border-purple-100 dark:border-slate-700'
                        } else if (stage.category === 'INTERVIEW' || stage.category === 'ASSESSMENT') {
                          dotColor = 'bg-indigo-500 animate-pulse'
                          bgClass = 'bg-indigo-50/50 dark:bg-indigo-900/10'
                          borderClass = 'border-indigo-100 dark:border-indigo-900/30'
                          textClass = 'text-indigo-600 dark:text-indigo-400'
                          badgeText = 'text-indigo-700 dark:text-indigo-300'
                          badgeBorder = 'border-indigo-100 dark:border-slate-700'
                        } else if (stage.category === 'SELECTED' || stage.category === 'OFFER' || stage.category === 'HIRED') {
                          dotColor = 'bg-emerald-500'
                          bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10'
                          borderClass = 'border-emerald-100 dark:border-emerald-900/30'
                          textClass = 'text-emerald-600 dark:text-emerald-400'
                          badgeText = 'text-emerald-700 dark:text-emerald-300'
                          badgeBorder = 'border-emerald-100 dark:border-slate-700'
                        }
                        
                        return (
                          <div 
                            key={stage.name} 
                            className={`${bgClass} rounded-3xl p-4 border ${borderClass} flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const candidateId = e.dataTransfer.getData('candidateId');
                              if (candidateId) {
                                handleCandidateDrop(candidateId, stage);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${textClass}`}>
                                <div className={`w-2 h-2 rounded-full ${dotColor}`}></div> {stage.name}
                              </h3>
                              <span className={`${badgeBg} px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeText} shadow-sm border ${badgeBorder}`}>
                                {stageCandidates.length}
                              </span>
                            </div>
                            <div className="space-y-4 flex-1">
                              {stageCandidates.map(cand => renderCandidateCard(cand))}
                            </div>
                          </div>
                        )
                      })
                      
                      // Always append Rejected column
                      if (shouldShowCandidateSection('rejected')) {
                        const rejectedCandidates = candidatesData.filter(c => belongsToSelectedPosition(c) && c.status === 'Rejected')
                        columns.push(
                          <div 
                            key="rejected" 
                            className="bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl p-4 border border-rose-100 dark:border-rose-900/30 flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const candidateId = e.dataTransfer.getData('candidateId');
                              if (candidateId) {
                                handleCandidateStatusChange({ id: candidateId }, 'Rejected');
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div> Rejected
                              </h3>
                              <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm border border-slate-100 dark:border-slate-700">
                                {rejectedCandidates.length}
                              </span>
                            </div>
                            <div className="space-y-4 flex-1">
                              {rejectedCandidates.map(cand => renderCandidateCard(cand))}
                            </div>
                          </div>
                        )
                      }
                      
                      return columns
                    } else {
                      // Fallback columns when no job is selected (All Candidates)
                      return (
                        <>
                          {/* Applied / Screening Column */}
                          {shouldShowCandidateSection('applied') && (
                          <div 
                            className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const candidateId = e.dataTransfer.getData('candidateId');
                              if (candidateId) {
                                handleCandidateStatusChange({ id: candidateId }, 'Pipeline');
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div> Applied
                              </h3>
                              <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                                {candidatesData.filter(c => {
                                  if (activeCandidateKpi !== 'all') {
                                    if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                                  }
                                  return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && (c.stage === 'Screening' || c.stage === 'Applied' || !c.stage);
                                }).length}
                              </span>
                            </div>
                            <div className="space-y-4 flex-1">
                              {candidatesData.filter(c => {
                                if (activeCandidateKpi !== 'all') {
                                  if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                                }
                                return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && (c.stage === 'Screening' || c.stage === 'Applied' || c.stage === 'AI Match' || !c.stage);
                              }).map(cand => renderCandidateCard(cand))}
                            </div>
                          </div>
                          )}

                          {/* Interviewing Column */}
                          {shouldShowCandidateSection('interviewing') && (
                          <div 
                            className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl p-4 border border-indigo-100 dark:border-indigo-900/30 flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const candidateId = e.dataTransfer.getData('candidateId');
                              if (candidateId) {
                                handleCandidateStageChange(candidateId, 'Technical Round');
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div> Interviewing
                              </h3>
                              <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-slate-700">
                                {candidatesData.filter(c => {
                                  if (activeCandidateKpi !== 'all') {
                                    if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                                  }
                                  return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && c.stage !== 'Screening' && c.stage !== 'Applied' && c.stage !== 'AI Match' && !!c.stage;
                                }).length}
                              </span>
                            </div>
                            <div className="space-y-4 flex-1">
                              {candidatesData.filter(c => {
                                if (activeCandidateKpi !== 'all') {
                                  if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                                }
                                return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && c.stage !== 'Screening' && c.stage !== 'Applied' && c.stage !== 'AI Match' && !!c.stage;
                              }).map(cand => renderCandidateCard(cand))}
                            </div>
                          </div>
                          )}

                          {/* Selected Column */}
                          {shouldShowCandidateSection('selected') && (
                          <div 
                            className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const candidateId = e.dataTransfer.getData('candidateId');
                              if (candidateId) {
                                handleCandidateStatusChange({ id: candidateId }, 'Selected');
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Selected
                              </h3>
                              <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-100 dark:border-slate-700">
                                {candidatesData.filter(c => {
                                  if (activeCandidateKpi !== 'all') {
                                    if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                                  }
                                  return c.status === 'Selected';
                                }).length}
                              </span>
                            </div>
                            <div className="space-y-4 flex-1">
                              {candidatesData.filter(c => {
                                if (activeCandidateKpi !== 'all') {
                                  if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                                }
                                return c.status === 'Selected';
                              }).map(cand => renderCandidateCard(cand))}
                            </div>
                          </div>
                          )}

                          {/* Offered Column */}
                          {shouldShowCandidateSection('selected') && (
                          <div 
                            className="bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl p-4 border border-amber-100 dark:border-amber-900/30 flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors"
                          >
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div> Offered
                              </h3>
                              <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-700 dark:text-amber-300 shadow-sm border border-amber-100 dark:border-slate-700">
                                {candidatesData.filter(c => {
                                  if (activeCandidateKpi !== 'all') {
                                    if (activeCandidateKpi === 'selected' && c.status !== 'Offered') return false;
                                  }
                                  return c.status === 'Offered';
                                }).length}
                              </span>
                            </div>
                            <div className="space-y-4 flex-1">
                              {candidatesData.filter(c => {
                                if (activeCandidateKpi !== 'all') {
                                  if (activeCandidateKpi === 'selected' && c.status !== 'Offered') return false;
                                }
                                return c.status === 'Offered';
                              }).map(cand => renderCandidateCard(cand))}
                            </div>
                          </div>
                          )}

                          {/* Rejected Column */}
                          {shouldShowCandidateSection('rejected') && (
                          <div 
                            className="bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl p-4 border border-rose-100 dark:border-rose-900/30 flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const candidateId = e.dataTransfer.getData('candidateId');
                              if (candidateId) {
                                handleCandidateStatusChange({ id: candidateId }, 'Rejected');
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div> Rejected
                              </h3>
                              <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm border border-slate-100 dark:border-slate-700">
                                {candidatesData.filter(c => {
                                  if (activeCandidateKpi !== 'all') {
                                    if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                                  }
                                  return c.status === 'Rejected';
                                }).length}
                              </span>
                            </div>
                            <div className="space-y-4 flex-1">
                              {candidatesData.filter(c => {
                                if (activeCandidateKpi !== 'all') {
                                  if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                                }
                                return c.status === 'Rejected';
                              }).map(cand => renderCandidateCard(cand))}
                            </div>
                          </div>
                          )}

                          {/* Referral Column */}
                          {shouldShowCandidateSection('referral') && (
                            <div 
                              className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl p-4 border border-indigo-100 dark:border-indigo-900/30 flex flex-col h-full min-h-[500px] min-w-[320px] w-[320px] flex-shrink-0 snap-start transition-colors"
                            >
                              <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Referrals
                                </h3>
                                <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-slate-700">
                                  {candidatesData.filter(c => {
                                    return c.status === 'Referral'
                                  }).length}
                                </span>
                              </div>
                              <div className="space-y-4 flex-1">
                                {candidatesData.filter(c => {
                                  return c.status === 'Referral'
                                }).map(cand => renderCandidateCard(cand))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    }
                  })()}
                </div>
                )}
                {!loading && hasMoreCandidates && (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={loadMoreCandidates}
                      disabled={loadingMore}
                      className="rounded-xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-900/50 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                    >
                      {loadingMore ? 'Loading more candidates...' : 'Load more candidates'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {analysisError && candidatePhase === 'idle' && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {analysisError}
            </div>
          )}

          {candidateFetchError && candidatePhase === 'idle' && !analysisError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Candidate data could not be loaded: {candidateFetchError}</span>
                {selectedPositionForCandidates && (
                  <button
                    type="button"
                    onClick={() => ensureCandidatesLoaded({ force: true })}
                    disabled={loading}
                    className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:bg-slate-900 dark:text-red-300"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
          
          {candidatePhase === 'upload' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm relative">
              <button 
                onClick={() => setCandidatePhase('idle')}
                className="absolute top-6 right-6 p-2.5 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 dark:text-slate-400 dark:bg-slate-800/50 dark:border-slate-700 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 dark:hover:text-red-400 rounded-full transition-all shadow-sm group"
                title="Close"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {candidateImportMode === 'directExcel' ? 'Import Candidates to Applied' : 'Import Candidate Data'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                  {candidateImportMode === 'directExcel'
                    ? 'Upload your completed Excel sheet, review the rows, and save them directly into Applied for this position.'
                    : 'Upload candidate spreadsheets (.csv, .tsv, .xls, .xlsx, .xlsm, .xlsb, .ods) or multiple resumes (.pdf, .docx) for automated parsing and candidate matching.'}
                </p>
              </div>

              <div className="flex flex-col">
                  <div 
                    className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all relative ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' 
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { 
                      e.preventDefault()
                      setIsDragging(false)
                      if (e.dataTransfer.files?.length) handleFilesUpload(e.dataTransfer.files)
                    }}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.tsv,.txt,.xls,.xlsx,.xlsm,.xlsb,.ods" onChange={(e) => {
                      if(e.target.files?.[0]) {
                        handleFilesUpload(e.target.files)
                        e.target.value = '' // reset so same file can be re-uploaded
                      }
                    }} />
                    <input type="file" ref={resumeInputRef} className="hidden" accept=".pdf,.docx,.doc" multiple onChange={(e) => {
                      if(e.target.files?.[0]) {
                        handleFilesUpload(e.target.files)
                        e.target.value = ''
                      }
                    }} />
                    
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
                      <UploadCloud className="w-10 h-10 text-indigo-500" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Drag and drop your files here</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-8 font-normal">
                      {candidateImportMode === 'directExcel'
                        ? 'Use the template, enter candidate details manually, save the file, then upload it here.'
                        : 'Upload candidate spreadsheets (.csv, .tsv, .xls, .xlsx, .xlsm, .xlsb, .ods) or multiple resumes (.pdf, .docx, .doc) to run automated parsing and AI shortlisting.'}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mt-6">
                      <button onClick={downloadCandidateTemplate} className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 px-6 py-3 rounded-xl font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download AI Analysis Template
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                        <UploadCloud className="w-4 h-4" /> {candidateImportMode === 'directExcel' ? 'Upload Completed Excel' : 'Upload Candidate Spreadsheet'}
                      </button>

                      {candidateImportMode !== 'directExcel' && (
                        <button onClick={() => resumeInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                          <FileText className="w-4 h-4" /> Upload Bulk Resumes (.pdf / .docx)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Error */}
                  {uploadError && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Upload Failed</p>
                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">{uploadError}</p>
                      </div>
                      <button onClick={() => setUploadError(null)} className="ml-auto p-1 text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* AI Analysis Hint */}
                  <div className="mt-6 w-full text-left rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm transition-all border-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-500/30">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="w-12 h-12 rounded-xl shadow-sm flex items-center justify-center bg-indigo-600 text-white shadow-indigo-500/30 flex-shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 mb-1">AI-Powered Resume Parsing</h4>
                        <p className="text-sm mt-0.5 max-w-lg text-indigo-600 dark:text-indigo-300 font-medium">Upload one or many resumes (PDF/DOCX) to extract candidate details, then analyze and shortlist against the selected position. CSV/Excel bulk candidate data is also supported.</p>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          )}

          {candidatePhase === 'uploaded' && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800 dark:from-emerald-500/10 dark:via-slate-900 dark:to-indigo-500/10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 shadow-sm dark:bg-slate-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> File Uploaded
                    </div>
                    <h2 className="text-xl font-black text-slate-950 dark:text-white">
                      {candidateImportMode === 'directExcel' ? 'Candidate data is ready to save' : 'Candidate data is ready to analyze'}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {parsedCandidates.length} candidate{parsedCandidates.length !== 1 ? 's' : ''} loaded from {uploadFileName || 'uploaded file'}.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setCandidatePhase('upload')} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      Upload Another
                    </button>
                    {candidateImportMode === 'directExcel' ? (
                      <button onClick={handleDirectExcelImport} disabled={directImportSaving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                        <Check className="h-4 w-4" /> {directImportSaving ? 'Saving to Applied...' : 'Save to Applied'}
                      </button>
                    ) : (
                      <button onClick={handleAnalyzeUploadedCandidates} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700">
                        <Sparkles className="h-4 w-4" /> Analyze Candidates
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Target Position</p>
                  <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{selectedPositionForCandidates?.title || 'No position selected'}</p>
                  <p className="text-sm font-medium text-slate-500">{selectedPositionForCandidates?.department || 'Department not set'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Matching Signals</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    Role title, skills, experience, department, and profile completeness.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Next Step</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {candidateImportMode === 'directExcel'
                      ? 'Save the reviewed rows to create candidates directly in Applied.'
                      : 'Analyze first, then add best candidates to Applied pipeline.'}
                  </p>
                </div>
              </div>

              {analysisError && (
                <div className="mx-6 mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {analysisError}
                </div>
              )}

              <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                  {parsedCandidates.slice(0, 8).map((candidate) => (
                    <span key={candidate.id || candidate.email} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {candidate.name || candidate.email}
                    </span>
                  ))}
                  {parsedCandidates.length > 8 && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">+{parsedCandidates.length - 8} more</span>}
                </div>
              </div>
            </div>
          )}

          {(candidatePhase === 'processing' || candidatePhase === 'analyzing') && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {candidatePhase === 'analyzing' ? 'Analyzing Candidate Match...' : uploadFileName?.match(/\.(pdf|docx|doc)$/i) ? 'Parsing Resume...' : 'Processing Candidate Data...'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                {candidatePhase === 'analyzing'
                  ? `Matching uploaded candidates against ${selectedPositionForCandidates?.title || 'the selected role'} and ranking the best fit.`
                  : uploadFileName?.match(/\.(pdf|docx|doc)$/i) 
                  ? 'Our AI is extracting candidate details, skills, experience and education from the resume.'
                  : `Reading and validating ${uploadFileName || 'your file'}...`
                }
              </p>
              <div className="flex items-center gap-2 text-sm text-indigo-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> Please wait...
              </div>
            </div>
          )}

          {candidatePhase === 'results' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-500/5 dark:to-purple-500/5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" /> Best Candidate Matches
                  </h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {parsedCandidates.length} analyzed candidate{parsedCandidates.length !== 1 ? 's' : ''} ranked from {uploadFileName || 'uploaded file'}
                    {selectedPositionForCandidates ? ` for "${selectedPositionForCandidates.title}"` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleShortlistGoodMatches}
                    disabled={Object.values(candidateActionLoading).some(Boolean)}
                    className="text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {Object.values(candidateActionLoading).some(Boolean) ? 'Saving...' : 'Shortlist >=70%'}
                  </button>
                  <button
                    onClick={handleAddAllToPipeline}
                    disabled={Object.values(candidateActionLoading).some(Boolean)}
                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {Object.values(candidateActionLoading).some(Boolean) ? 'Saving...' : 'Add All'}
                  </button>
                  <button onClick={() => setCandidatePhase('upload')} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Upload More
                  </button>
                  <button onClick={() => setCandidatePhase('idle')} className="p-2 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors" title="Close AI Match Results">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Candidate</th>
                      <th className="px-6 py-4">Match</th>
                      <th className="px-6 py-4">Experience</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4">Analysis</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {parsedCandidates.map((cand, i) => {
                      const localStatus = localCandidateStatuses[cand.email || cand.id];
                      const actionLoading = !!candidateActionLoading[cand.email || cand.id];
                      return (
                      <tr key={cand.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${
                            i === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : i === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            #{i + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{cand.name}</div>
                          <div className="text-xs text-slate-500">{cand.email}</div>
                          {cand.phone && <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> {cand.phone}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="min-w-32">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-lg font-black text-slate-900 dark:text-white">{Math.round(cand.score || 0)}%</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                cand.score >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : cand.score >= 70 ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                                : cand.score >= 50 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                              }`}>{cand.matchLabel || 'Not analyzed'}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${Math.min(100, cand.score || 0)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>{cand.exp || '—'}</div>
                          {cand.role && <div className="text-xs text-slate-500 mt-0.5">{cand.role}</div>}
                        </td>
                        <td className="px-6 py-4">
                          {cand.skills && cand.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {cand.skills.slice(0, 5).map((s, si) => (
                                <span key={si} className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md">{s}</span>
                              ))}
                              {cand.skills.length > 5 && <span className="text-[10px] text-slate-400 font-medium">+{cand.skills.length - 5} more</span>}
                            </div>
                          ) : cand.source === 'CSV' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                              <FileSpreadsheet className="w-3 h-3" /> CSV Import
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs space-y-1">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                              cand.analysisSource === 'AI'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : cand.analysisSource === 'LOGICAL'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {cand.analysisSource === 'AI' ? 'AI analyzed' : cand.analysisSource === 'LOGICAL' ? 'Skills analyzed' : 'Fallback score'}
                            </span>
                            {cand.analysisSummary && (!cand.strengths || cand.strengths.length === 0) && (!cand.concerns || cand.concerns.length === 0) ? (
                              <div className="text-[11px] text-slate-500 italic">
                                {cand.analysisSummary}
                              </div>
                            ) : (
                              <>
                                {(cand.strengths || []).slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                                    <Check className="mt-0.5 h-3 w-3 shrink-0" /> {item}
                                  </div>
                                ))}
                                {(cand.concerns || []).slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {item}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {localStatus === 'Pipeline' ? (
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-xl">
                              <Users className="w-4 h-4" /> In Pipeline
                            </span>
                          ) : localStatus === 'Shortlisted' ? (
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl">
                              <CheckCircle2 className="w-4 h-4" /> Shortlisted
                            </span>
                          ) : localStatus === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-xl">
                              <Trash2 className="w-4 h-4" /> Skipped
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleCandidateStatusChange(cand, 'Rejected')}
                                disabled={actionLoading}
                                className="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading ? 'Saving...' : 'Skip'}
                              </button>
                              <button 
                                onClick={() => handleCandidateStatusChange(cand, 'Pipeline')}
                                disabled={!cand.email || actionLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {actionLoading ? 'Saving...' : 'Add to Pipeline'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      ) : null}

      {showAllCandidatesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                  <Users className="h-5 w-5 text-indigo-500" /> All Candidates
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Candidates grouped by every currently open position.</p>
              </div>
              <button type="button" onClick={() => setShowAllCandidatesModal(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" title="Close all candidates">
                <X className="h-5 w-5" />
              </button>
            </div>

            {allCandidatesError && (
              <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {allCandidatesError}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Open Position</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Experience / CTC</th>
                    <th className="px-6 py-4">Current Stage</th>
                    <th className="px-6 py-4">Applied On</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allCandidatesLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`all-candidate-loading-${index}`} className="animate-pulse">
                        {Array.from({ length: 7 }).map((__, cell) => <td key={cell} className="px-6 py-5"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" /></td>)}
                      </tr>
                    ))
                  ) : allCandidatesRows.length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-16 text-center text-slate-500">No candidates found for open positions.</td></tr>
                  ) : allCandidatesRows.map((candidate) => {
                    const stageCategory = String(candidate.stageCategory || '').toUpperCase()
                    const lifecycleStatus = candidate.status === 'HIRED' || stageCategory === 'HIRED'
                      ? 'Hired'
                      : stageCategory === 'OFFER' || candidate.offerStatus === 'SENT' || candidate.offerStatus === 'VIEWED'
                        ? 'Offered'
                        : stageCategory === 'SELECTED' || candidate.selectionStatus?.startsWith('SELECTION_')
                          ? 'Selected'
                          : candidate.status === 'REJECTED' || candidate.status === 'Rejected'
                            ? 'Rejected'
                            : candidate.stage || 'Applied'
                    const department = typeof candidate.jobDepartment === 'object' ? candidate.jobDepartment?.name : candidate.jobDepartment
                    return (
                      <tr key={candidate.applicationId} className="text-slate-700 transition hover:bg-indigo-50/40 dark:text-slate-300 dark:hover:bg-indigo-500/5">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{candidate.candidateName || 'Unnamed candidate'}</div>
                          <div className="mt-1 text-xs text-slate-500">{candidate.candidateCode || candidate.applicationCode || 'Application'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{candidate.jobTitle || 'Position unavailable'}</div>
                          <div className="mt-1 text-xs text-slate-500">{[candidate.jobCode, department, candidate.jobLocation].filter(Boolean).join(' · ') || 'Position details unavailable'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div>{candidate.email || 'No email'}</div>
                          <div className="mt-1 text-xs text-slate-500">{candidate.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div>{candidate.experience != null ? `${candidate.experience} years` : 'Not specified'}</div>
                          <div className="mt-1 text-xs text-slate-500">CTC: {candidate.expectedCtc || 'Not specified'}</div>
                        </td>
                        <td className="px-6 py-4"><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{lifecycleStatus}</span></td>
                        <td className="px-6 py-4 text-xs">{formatCandidateDate(candidate.appliedAt, 'Not available')}</td>
                        <td className="px-6 py-4"><button type="button" onClick={() => openCandidatePosition(candidate)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300">Open Pipeline</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500">Showing {allCandidatesRows.length} candidate applications from open positions.</p>
              {allCandidatesHasMore && <button type="button" onClick={() => loadAllCandidates({ append: true })} disabled={allCandidatesLoadingMore} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{allCandidatesLoadingMore ? 'Loading...' : 'Load More'}</button>}
            </div>
          </div>
        </div>
      )}

      <PositionDetailsModal 
        position={selectedPosition} 
        onClose={() => setSelectedPosition(null)} 
      />
      
      <SendOfferModal 
        candidate={selectedOfferCandidate} 
        onClose={() => setSelectedOfferCandidate(null)}
        onSend={async (candidate) => {
          const originalCand = candidatesData.find(c => c.id === candidate.id)
          if (candidate.email && originalCand && candidate.email !== originalCand.email) {
            try {
              await candidateApi.update(candidate.candidateId || originalCand.candidateId, { email: candidate.email })
            } catch (e) {
              console.warn('Failed to update candidate email before sending offer', e)
            }
          }
          await sendOffer(candidate)
          void fetchCandidates({ ...candidateFetchParams(), force: true }).catch((error) => {
            console.warn('Candidate refresh after offer send failed:', error)
          })
          setSelectedOfferCandidate(null)
        }}
      />
      {showManualCandidateModal && (
        <ManualCandidateModal 
          position={selectedPositionForCandidates}
          onClose={() => setShowManualCandidateModal(false)}
          onSave={async (candidateData) => {
            try {
              const res = await candidateApi.bulkApply({
                jobId: selectedPositionForCandidates?.id,
                candidates: [candidateData]
              });
              if (res.data?.success) {
                setShowManualCandidateModal(false);
                ensureCandidatesLoaded({ force: true });
              } else {
                throw new Error(res.data?.message || 'Failed to add candidate');
              }
            } catch (err) {
              const msg = err.response?.data?.message || 'Failed to add candidate';
              throw new Error(msg);
            }
          }}
        />
      )}

      {showCandidateSpreadsheetEditor && (
        <CandidateSpreadsheetEditor
          position={selectedPositionForCandidates}
          onClose={() => setShowCandidateSpreadsheetEditor(false)}
          onSave={async (rows) => {
            await handleDirectExcelImport(rows)
            setShowCandidateSpreadsheetEditor(false)
          }}
        />
      )}

      {showOpenPositionModal && (
        <OpenPositionModal 
          initialData={editingPositionForModal}
          options={{ departments, employees }}
          saveError={positionActionError}
          onSave={handleSavePosition}
          onAutoSave={editingPositionForModal ? (form) => handleSavePosition(form, { close: false }) : undefined}
          onClose={() => {
            setShowOpenPositionModal(false)
            setEditingPositionForModal(null)
          }} 
        />
      )}

      <ConfirmDialog
        open={!!candidateToUndo}
        title="Undo candidate stage?"
        description={`Are you sure you want to return ${candidateToUndo?.name || 'this candidate'} to the previous pipeline stage? Any pending selection or active offer will be withdrawn.`}
        requireReason={false}
        confirmLabel="Undo Stage"
        variant="primary"
        loading={!!candidateToUndo && !!candidateActionLoading[`undo:${candidateToUndo.id}`]}
        error={undoConfirmError || ''}
        onClose={() => {
          if (!candidateToUndo || !candidateActionLoading[`undo:${candidateToUndo.id}`]) {
            setCandidateToUndo(null)
            setUndoConfirmError(null)
          }
        }}
        onConfirm={() => candidateToUndo && handleCandidateUndo(candidateToUndo)}
      />
      
      <ConfirmDialog
        open={!!positionToDelete}
        title="Cancel Position"
        description={`Are you sure you want to cancel the position "${positionToDelete?.title}"? This is a permanent workflow state and will remove the position from active hiring.`}
        requireReason={false}
        confirmLabel="Cancel Position"
        variant="danger"
        loading={positionActionLoading}
        error={positionActionError || ''}
        onClose={() => {
          setPositionToDelete(null)
          setPositionActionError(null)
        }}
        onConfirm={async (reason) => {
          if (positionToDelete) {
            setPositionActionError(null)
            setPositionActionLoading(true)
            try {
              await jobApi.cancel(positionToDelete.id, reason || 'Cancelled from recruitment positions list', true)
              await fetchPositions({ force: true })
              setPositionActionError(null)
              setPositionToDelete(null)
            } catch (err) {
              console.error('Failed to cancel position', err)
              setPositionActionError(err.response?.data?.message || err.message || 'Failed to cancel position.')
            } finally {
              setPositionActionLoading(false)
            }
          }
        }}
      />

      <PublishJobModal 
        position={publishingPosition}
        onClose={() => setPublishingPosition(null)}
        onPublish={(id, platforms) => {
          // You could save this to the position state here
          console.log(`Published position ${id} to`, platforms)
        }}
      />

      {/* Schedule Interview Modal */}
      {schedulingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 relative transition-all ${schedulingStep === 'email' ? 'max-w-2xl' : 'max-w-md'}`}>
            
            {schedulingStep === 'success' && scheduleSuccess ? (
              <div className="py-8 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <Mail className="w-10 h-10 text-emerald-600 dark:text-emerald-400 absolute opacity-0 animate-[ping_1s_ease-out_forwards]" />
                  <Send className="w-8 h-8 text-emerald-600 dark:text-emerald-400 relative z-10 translate-x-0.5 -translate-y-0.5" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {scheduleSuccess.emailWarning ? 'Interview Scheduled' : 'Email Sent!'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-[280px] mx-auto">
                  <strong className="text-slate-700 dark:text-slate-300">{scheduleSuccess.name}</strong> {scheduleSuccess.emailWarning ? 'has an interview scheduled, but the email invite was not delivered.' : 'has been notified about their upcoming'} <strong className="text-slate-700 dark:text-slate-300">{scheduleSuccess.type}</strong>.
                </p>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 text-left border border-indigo-100 dark:border-indigo-800 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl"></div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                    <Mail className="w-4 h-4" /> {scheduleSuccess.emailWarning ? 'Email Not Sent' : 'Message Sent'}
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {scheduleSuccess.body}
                    </p>
                  </div>
                </div>

                {scheduleSuccess.emailWarning && scheduleSuccess.interviewId && (
                  <button
                    type="button"
                    disabled={isResendingInvite}
                    onClick={async () => {
                      setIsResendingInvite(true)
                      setSchedulingError(null)
                      try {
                        await interviewApi.resendInvite(scheduleSuccess.interviewId, {
                          candidateEmail: schedulingCandidate?.email,
                          candidateEmailSubject: `Interview Invite: ${scheduleSuccess.type} at NexaHR`,
                          candidateEmailBody: emailDraft,
                        })
                        setScheduleSuccess((previous) => ({ ...previous, emailWarning: null, body: emailDraft }))
                      } catch (error) {
                        setSchedulingError(error.response?.data?.message || error.message || 'Interview invite could not be sent.')
                      } finally {
                        setIsResendingInvite(false)
                      }
                    }}
                    className="mb-3 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
                  >
                    {isResendingInvite ? 'Sending invite...' : 'Retry Email Invite'}
                  </button>
                )}

                <button 
                  onClick={() => {
                    setScheduleSuccess(null)
                    setSchedulingCandidate(null)
                    setSchedulingStep('details')
                    setSchedulingError(null)
                    setIsSchedulingInvite(false)
                    setIsResendingInvite(false)
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-4 py-3 rounded-xl font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : schedulingStep === 'email' ? (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-500" />
                    Review Official Email
                  </h3>
                  <button 
                    onClick={() => {
                      setSchedulingCandidate(null)
                      setSchedulingStep('details')
                      setSchedulingError(null)
                      setIsSchedulingInvite(false)
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Review and edit the invitation email before sending it to <strong className="text-slate-900 dark:text-white">{schedulingCandidate.name}</strong>.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">To (Candidate Email)</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                    value={schedulingCandidate.email || ''}
                    onChange={(e) => setSchedulingCandidate({ ...schedulingCandidate, email: e.target.value })}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Message</label>
                  <textarea 
                    className="w-full min-h-[400px] p-4 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-y" 
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                  />
                </div>

                {schedulingError && (
                  <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                    <div className="flex-1 font-medium">{schedulingError}</div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    disabled={isSchedulingInvite}
                    onClick={() => {
                      setSchedulingError(null)
                      setSchedulingStep('details')
                    }} 
                    className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    disabled={isSchedulingInvite}
                    onClick={async () => {
                      if (!schedulingCandidate?.email?.trim()) {
                        setSchedulingError('Please enter a valid candidate email address to send the invitation.')
                        return
                      }
                      if (!schedulingFormData?.rawDate || !schedulingFormData?.rawTime) {
                        setSchedulingError('Interview date and time are missing. Please go back and select a date and time.')
                        return
                      }

                      setIsSchedulingInvite(true)
                      setSchedulingError(null)

                      const interviewType = schedulingFormData.type.includes('Technical') ? 'TECHNICAL'
                        : schedulingFormData.type.includes('Final') ? 'FINAL'
                        : schedulingFormData.type.includes('HR') ? 'MANAGERIAL'
                        : 'SCREENING'
                      try {
                        const originalCand = candidatesData.find(c => c.id === schedulingCandidate.id)
                        if (schedulingCandidate.email && originalCand && schedulingCandidate.email !== originalCand.email) {
                          try {
                            await candidateApi.update(schedulingCandidate.candidateId, { email: schedulingCandidate.email.trim() })
                          } catch (e) {
                            console.warn('Failed to update candidate email before scheduling', e)
                          }
                        }

                        const scheduleResult = await scheduleInterview(schedulingCandidate, {
                          roundName: schedulingFormData.type,
                          type: interviewType,
                          date: schedulingFormData.rawDate,
                          startTime: schedulingFormData.rawTime,
                          mode: schedulingFormData.link ? 'ONLINE' : 'ONLINE',
                          meetingUrl: schedulingFormData.link,
                          candidateInstructions: emailDraft,
                          candidateEmailSubject: `Interview Invite: ${schedulingFormData.type} at NexaHR`,
                          candidateEmail: schedulingCandidate.email.trim(),
                          interviewers: selectedInterviewerIds.map((employeeId, index) => ({ employeeId, role: index === 0 ? 'PRIMARY' : 'PANELIST' })),
                        })
                        void fetchCandidates({ ...candidateFetchParams(), force: true }).catch((error) => {
                          console.warn('Candidate refresh after interview scheduling failed:', error)
                        })
                        setScheduleSuccess({
                          name: schedulingCandidate.name,
                          interviewId: scheduleResult?.interview?._id || scheduleResult?.interview?.id || null,
                          email: schedulingCandidate.email || null,
                          date: schedulingFormData.date,
                          time: schedulingFormData.time,
                          type: schedulingFormData.type,
                          emailWarning: scheduleResult?.emailWarning || null,
                          body: scheduleResult?.emailWarning
                            ? `${emailDraft}\n\nNote: ${scheduleResult.emailWarning}`
                            : emailDraft
                        });
                        setSchedulingStep('success');
                      } catch (err) {
                        console.error('Interview schedule failed:', err)
                        setSchedulingError(err.response?.data?.message || err.message || 'Failed to schedule interview. Please verify details and try again.')
                      } finally {
                        setIsSchedulingInvite(false)
                      }
                    }} 
                    className="flex-[2] bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSchedulingInvite ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending Official Invite...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Official Invite
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-left-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    Schedule Interview
                  </h3>
                  <button 
                    onClick={() => {
                      setScheduleSuccess(null)
                      setSchedulingCandidate(null)
                      setSchedulingStep('details')
                      setSchedulingError(null)
                      setIsSchedulingInvite(false)
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  You are scheduling an interview for <strong className="text-slate-900 dark:text-white">{schedulingCandidate.name}</strong> for the role of <strong className="text-slate-900 dark:text-white">{schedulingCandidate.role}</strong>. An invite will be sent to their email.
                </p>

                {schedulingError && (
                  <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                    <div className="flex-1 font-medium">{schedulingError}</div>
                  </div>
                )}

                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const dateVal = formData.get('date');
                  const timeVal = formData.get('time');
                  const type = formData.get('type');
                  const link = formData.get('link');

                  if (!dateVal || !timeVal || !type) {
                    setSchedulingError('Select an interview type, date, and time before continuing.');
                    return;
                  }
                  if (!selectedInterviewerIds.length) {
                    setSchedulingError('Select at least one interviewer before continuing.');
                    return;
                  }

                  const selectedDateTime = new Date(`${dateVal}T${timeVal}:00`);
                  if (Number.isNaN(selectedDateTime.getTime()) || selectedDateTime <= new Date()) {
                    setSchedulingError('Choose a future interview date and time.');
                    return;
                  }
                  
                  const [year, month, day] = dateVal.split('-');
                  const d = new Date(year, month - 1, day);
                  const formattedDate = !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Scheduled';
                  
                  const [hours, minutes] = timeVal.split(':');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  const h12 = hours % 12 || 12;
                  const formattedTime = `${h12}:${minutes} ${ampm}`;

                  setSchedulingFormData({
                    type,
                    rawDate: dateVal,
                    rawTime: timeVal,
                    date: formattedDate,
                    time: formattedTime,
                    link
                  });

                  const defaultEmail = `Subject: Interview Invitation - NexaHR

Dear ${schedulingCandidate.name},

Congratulations! We are pleased to inform you that you have been shortlisted for the ${schedulingCandidate.role} position at NexaHR.

We would like to invite you for a ${type} to discuss your background and how you can contribute to our team.

Interview Details:
- Date: ${formattedDate}
- Time: ${formattedTime}
- Link: ${link || 'To be shared prior to the interview'}

Please reply to this email to confirm if this time works for you, or if you need to reschedule.

Best regards,
NexaHR Talent Acquisition Team`;
                  
                  setSchedulingError(null);
                  setEmailDraft(defaultEmail);
                  setSchedulingStep('email');
                }}>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Interview Type</label>
                    <select name="type" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                      <option value="Screening">Screening Round</option>
                      <option value="Technical Round">Technical Round</option>
                      <option value="HR Round">HR Round</option>
                      <option value="Final Round">Final Round</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                      <input type="date" name="date" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Time</label>
                      <input type="time" name="time" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Meeting Link</label>
                    <input type="url" name="link" placeholder="https://meet.google.com/..." className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Interviewers</label>
                      <span className="text-xs text-slate-500">{selectedInterviewerIds.length} selected</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                      {interviewersLoading ? (
                        <div className="flex items-center gap-2 px-2 py-3 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading active interviewers...</div>
                      ) : interviewers.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-rose-600">No active employees are available for interviewing.</p>
                      ) : (
                        interviewers.map((employee) => {
                          const id = String(employee._id || employee.id)
                          const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email || 'Employee'
                          return (
                            <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white dark:hover:bg-slate-700">
                              <input
                                type="checkbox"
                                checked={selectedInterviewerIds.includes(id)}
                                onChange={() => setSelectedInterviewerIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])}
                                className="h-4 w-4 accent-indigo-600"
                              />
                              <span className="min-w-0 text-sm text-slate-700 dark:text-slate-200"><span className="block font-semibold">{name}</span><span className="block truncate text-xs text-slate-500">{employee.role || employee.email || 'Active employee'}</span></span>
                            </label>
                          )
                        })
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Each selected interviewer will receive an approval notification.</p>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => { setScheduleSuccess(null); setSchedulingCandidate(null); setSchedulingStep('details'); setSchedulingError(null); setIsSchedulingInvite(false); }} className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-[2] bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                      Next: Compose Email <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Candidate Info Modal */}
      {selectedCandidateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Candidate Information
              </h3>
              <button 
                onClick={() => setSelectedCandidateInfo(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedCandidateInfo.name}</h4>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{selectedCandidateInfo.role}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 rounded-lg text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> {Math.round(selectedCandidateInfo.score || 0)}% Match
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedCandidateInfo.email && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <a href={`mailto:${selectedCandidateInfo.email}`} className="hover:text-indigo-600 transition-colors">{selectedCandidateInfo.email}</a>
                    </div>
                  )}
                  {selectedCandidateInfo.phone && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <a href={`tel:${selectedCandidateInfo.phone}`} className="hover:text-indigo-600 transition-colors">{selectedCandidateInfo.phone}</a>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-500 mb-1">Status</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedCandidateInfo.status === 'Selected' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : 
                     selectedCandidateInfo.status === 'Rejected' ? <X className="w-4 h-4 text-red-500" /> : 
                     <Clock className="w-4 h-4 text-indigo-500" />}
                    {selectedCandidateInfo.status}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-500 mb-1">Current Stage</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {selectedCandidateInfo.stage || 'Applied'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button 
                onClick={() => setSelectedCandidateInfo(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-4 py-3 rounded-xl font-bold transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
