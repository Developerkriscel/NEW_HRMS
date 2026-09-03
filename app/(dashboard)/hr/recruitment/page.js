'use client'

import { Plus, Briefcase, Users, UploadCloud, FileSpreadsheet, Download, UserPlus, Calendar, FileText, Sparkles, CheckCircle2, ChevronRight, Check, Edit, Trash2, PowerOff, PlayCircle, PauseCircle, X, Eye, Globe, Clock, MapPin, DollarSign, Mail, Send, Phone, AlertCircle, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { PositionDetailsModal } from '@/components/pages/recruitment/PositionDetailsModal'
import { SendOfferModal } from '@/components/pages/recruitment/SendOfferModal'
import { OpenPositionModal } from '@/components/pages/recruitment/OpenPositionModal'
import { PublishJobModal } from '@/components/pages/recruitment/PublishJobModal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useRecruitmentStore } from '@/store/recruitmentStore'
import { useAuthStore } from '@/store/authStore'
import { candidateApi } from '@/services/candidateApi'

// Utility: parse a CSV string into an array of candidate-shaped objects
// Supports any common column names (partial match, case-insensitive)
function parseCSVLine(line) {
  // Handle quoted fields that may contain commas
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
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

function parseCSVToCandidates(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 1) return []
  
  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/["'\r]/g, '').trim())
  
  // Flexible header matching - partial, case-insensitive
  const nameIdx = findColIdx(headers, ['name', 'candidate', 'full name', 'fullname'])
  const firstIdx = findColIdx(headers, ['first'])
  const lastIdx = findColIdx(headers, ['last', 'surname'])
  const emailIdx = findColIdx(headers, ['email', 'e-mail', 'mail'])
  const phoneIdx = findColIdx(headers, ['phone', 'mobile', 'contact', 'cell'])
  const expIdx = findColIdx(headers, ['exp', 'experience', 'years', 'yrs'])
  const roleIdx = findColIdx(headers, ['role', 'title', 'position', 'designation', 'job'])
  
  // Need at least one identifying column
  const hasName = nameIdx !== -1 || (firstIdx !== -1)
  const hasEmail = emailIdx !== -1
  if (!hasName && !hasEmail) {
    // Last resort: just use first 3 columns as name, email, phone
    if (headers.length >= 1) {
      // Try to process anyway using positional guessing
      return lines.slice(1).map((line, i) => {
        const cols = parseCSVLine(line)
        return {
          id: `csv-${i}`,
          name: cols[0] || '',
          email: cols[1] || '',
          phone: cols[2] || '',
          exp: null,
          role: '',
          score: null,
          source: 'CSV',
        }
      }).filter(c => (c.name || c.email) && c.name !== rawHeaders[0]) // skip header row if repeated
    }
    return []
  }
  
  return lines.slice(1).map((line, i) => {
    const cols = parseCSVLine(line)
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
      score: null,
      source: 'CSV',
    }
  }).filter(c => (c.name || c.email) && c.name.trim() !== '')
}

export default function RecruitmentDashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN'
  const [activeTab, setActiveTab] = useState('positions')
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [showOpenPositionModal, setShowOpenPositionModal] = useState(false)
  const [editingPositionForModal, setEditingPositionForModal] = useState(null)
  const [positionToDelete, setPositionToDelete] = useState(null)
  const [publishingPosition, setPublishingPosition] = useState(null)
  const [selectedPositionForCandidates, setSelectedPositionForCandidates] = useState(null)
  
  // Candidate Data State
  const [uploadSource, setUploadSource] = useState('linkedin')
  const [isDragging, setIsDragging] = useState(false)
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true)
  const fileInputRef = useRef(null)
  const resumeInputRef = useRef(null)
  
  // Workflow States
  const [candidatePhase, setCandidatePhase] = useState('idle') // idle, upload, processing, results
  // Local status map for AI Match table — tracks Add/Reject instantly without waiting for DB
  const [localCandidateStatuses, setLocalCandidateStatuses] = useState({}) // { [email]: 'Pipeline' | 'Rejected' }
  // Real parsed candidates from backend API or CSV parsing
  const [parsedCandidates, setParsedCandidates] = useState([])
  const [uploadError, setUploadError] = useState(null)
  const [uploadFileName, setUploadFileName] = useState(null)
  const [selectedOfferCandidate, setSelectedOfferCandidate] = useState(null)
  const [schedulingCandidate, setSchedulingCandidate] = useState(null)
  const [schedulingStep, setSchedulingStep] = useState('details') // details, email, success
  const [schedulingFormData, setSchedulingFormData] = useState(null)
  const [emailDraft, setEmailDraft] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState(null)
  const [selectedCandidateInfo, setSelectedCandidateInfo] = useState(null)
  
  // Global Store State
  const { candidates: candidatesData, offers: offersList, rejected: rejectedList, updateCandidateStatus, updateCandidateStage, selectCandidate, scheduleInterview, sendOffer, acceptOffer, rejectOffer, fetchCandidates, loading } = useRecruitmentStore()
  
  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  const formatInterviewSchedule = (cand) => {
    if (!cand?.interviewAt) return null
    const date = new Date(cand.interviewAt)
    if (Number.isNaN(date.getTime())) return null
    const dateText = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    const start = cand.interviewTime || date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const end = cand.interviewEndTime ? ` - ${cand.interviewEndTime}` : ''
    return `${dateText}, ${start}${end}`
  }



  const renderCandidateCard = (cand) => {
    // Determine the lane/visual based on status and stage
    const isPipelineStatus = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral'].includes(cand.status)
    const isApplied = isPipelineStatus && (cand.stage === 'Screening' || cand.stage === 'Applied' || cand.stage === 'AI Match' || !cand.stage);
    const isInterviewing = isPipelineStatus && !isApplied;
    
    return (
      <div key={cand.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
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
            <Sparkles className="w-3 h-3" /> {cand.score || 0}%
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
              {cand.appliedAt ? new Date(cand.appliedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          
          {/* Always show interview date if stage implies they moved past applied */}
          {(cand.interviewAt || (!['Screening', 'Applied', 'AI Match'].includes(cand.stage) && cand.stage)) && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-400"/> Select for interview:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {cand.interviewAt ? new Date(cand.interviewAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending'}
              </span>
            </div>
          )}

          {cand.status === 'HIRED' && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400"/> Selected:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {cand.selectedAt ? new Date(cand.selectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
                    {offer.offerSentAt ? new Date(offer.offerSentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          {cand.status === 'Rejected' && (
            <button onClick={() => handleCandidateStatusChange(cand, 'Pipeline')} className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold transition-colors">Restore to Pipeline</button>
          )}
          
          {cand.status === 'Selected' && (
            (() => {
              const offer = offersList.find(o => o.id === cand.id);
              if (!offer || !offer.offerStatus || offer.offerStatus === 'Draft') {
                return (
                  <button onClick={() => setSelectedOfferCandidate(cand)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-md shadow-emerald-500/20">
                    <FileText className="w-4 h-4"/> Create Offer Letter
                  </button>
                )
              }
              if (offer.offerStatus === 'Sent') {
                return (
                  <div className="flex flex-col gap-2">
                    <div className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5"/> Offer Sent - Waiting
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => rejectOffer(cand)} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 py-1.5 rounded-lg text-xs font-bold transition-colors">Declined</button>
                      <button onClick={() => acceptOffer(cand)} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">Accepted</button>
                    </div>
                  </div>
                )
              }
              if (offer.offerStatus === 'Accepted') {
                return (
                  <div className="w-full bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4"/> Ready for onboarding
                  </div>
                )
              }
              if (offer.offerStatus === 'Rejected') {
                return (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                    <X className="w-4 h-4"/> Offer Declined
                  </div>
                )
              }
            })()
          )}

          {isApplied && (
            <div className="flex gap-2">
              <button onClick={() => handleCandidateStatusChange(cand, 'Rejected')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-bold transition-colors">Reject</button>
              <button onClick={() => updateCandidateStage(cand.id, 'Technical Round')} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition-colors">Select for interview</button>
            </div>
          )}

          {isInterviewing && (
            <>
              <button onClick={() => setSchedulingCandidate(cand)} className={`w-full ${cand.stage.includes('(On ') ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'} py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 mb-2`}>
                <Calendar className="w-3.5 h-3.5"/> {cand.stage.includes('(On ') ? 'Reschedule Interview' : 'Schedule Interview'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => handleCandidateStatusChange(cand, 'Rejected')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-bold transition-colors">Reject</button>
                <button onClick={() => handleCandidateStatusChange(cand, 'Selected')} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition-colors">Select & Offer</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Positions State
  const [positionsList, setPositionsList] = useState([
    { id: 1, title: 'Senior Frontend Developer', department: 'Engineering', status: 'Active' },
    { id: 2, title: 'Product Designer', department: 'Design', status: 'Active' },
    { id: 3, title: 'Marketing Specialist', department: 'Marketing', status: 'On Hold' },
    { id: 4, title: 'Backend Developer', department: 'Engineering', status: 'Closed' },
    { id: 5, title: 'Sales Manager', department: 'Sales', status: 'Closed' },
  ])


  // Handle file upload — detects file type and routes to proper handler
  const handleFileUpload = async (file) => {
    if (!file) return
    setUploadError(null)
    setUploadFileName(file.name)
    const ext = (file.name?.split('.').pop() || '').toLowerCase()
    
    if (ext === 'csv') {
      // CSV: parse as plain text
      setCandidatePhase('processing')
      try {
        const text = await file.text()
        const candidates = parseCSVToCandidates(text)
        if (candidates.length === 0) {
          setUploadError('No valid candidates found in the CSV. Make sure it has columns like Name, Email, Phone.')
          setCandidatePhase('upload')
          return
        }
        setParsedCandidates(candidates)
        setLocalCandidateStatuses({})
        setCandidatePhase('results')
      } catch (err) {
        setUploadError('Failed to read the CSV file. Please check the format and try again.')
        setCandidatePhase('upload')
      }
    } else if (['xlsx', 'xls'].includes(ext)) {
      // Excel: use SheetJS to parse binary format
      setCandidatePhase('processing')
      try {
        if (!XLSX?.read || !XLSX?.utils?.sheet_to_json) {
          throw new Error('Excel parser did not load correctly')
        }
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        // Convert sheet to array of objects using header row
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        if (!jsonRows || jsonRows.length === 0) {
          setUploadError('No data rows found in the Excel file. Please add candidate data below the header row.')
          setCandidatePhase('upload')
          return
        }
        // Map any column names flexibly to candidate fields
        function flexFind(obj, patterns) {
          const key = Object.keys(obj).find(k => patterns.some(p => k.toLowerCase().includes(p)))
          return key ? String(obj[key] || '').trim() : ''
        }
        const candidates = jsonRows.map((row, i) => {
          const name = flexFind(row, ['name', 'candidate', 'full']) ||
            [flexFind(row, ['first']), flexFind(row, ['last', 'surname'])].filter(Boolean).join(' ')
          return {
            id: `xlsx-${i}`,
            name: name,
            email: flexFind(row, ['email', 'mail']),
            phone: flexFind(row, ['phone', 'mobile', 'contact', 'cell']),
            exp: flexFind(row, ['exp', 'experience', 'years', 'yrs']) || null,
            role: flexFind(row, ['role', 'title', 'position', 'designation', 'job']),
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
        setCandidatePhase('results')
      } catch (err) {
        console.error('Excel parse error:', err)
        setUploadError('Failed to read the Excel file. Please make sure it is a valid .xlsx or .xls file.')
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
        setCandidatePhase('results')
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to upload resume. Please try again.'
        setUploadError(msg)
        setCandidatePhase('upload')
      }
    } else {
      setUploadError('Unsupported file type. Please upload a PDF, DOCX for resume — or CSV / Excel (.xlsx) for bulk import.')
    }
  }

  const handleAddAllToPipeline = async () => {
    // Update all to Pipeline in local state instantly
    const newStatuses = {}
    parsedCandidates.forEach(c => { newStatuses[c.email || c.id] = 'Pipeline' })
    setLocalCandidateStatuses(newStatuses)

    // Background save to DB
    try {
      const candidatesToImport = parsedCandidates.filter(cand => 
        localCandidateStatuses[cand.email || cand.id] !== 'Pipeline'
      );
      if (candidatesToImport.length > 0) {
        const jobId = selectedPositionForCandidates?.id || null;
        await candidateApi.bulkApply({ candidates: candidatesToImport, jobId, jobTitle: selectedPositionForCandidates?.title });
        fetchCandidates() // Refresh pipeline after import
      }
    } catch (err) {
      console.warn('Background save failed (Add All):', err.message);
    }
  }

  const handleCandidateStatusChange = async (cand, newStatus) => {
    // Update UI instantly — no waiting for API
    setLocalCandidateStatuses(prev => ({ ...prev, [cand.email || cand.id]: newStatus }))
    
    // Try to save to DB in background — failure is silent, UI stays correct
    if (newStatus === 'Rejected') {
      try {
        await updateCandidateStatus(cand, 'Rejected')
      } catch (err) {
        console.warn('Reject failed:', err.message)
      }
    } else if (newStatus === 'Selected') {
      try {
        await selectCandidate(cand)
        setSelectedOfferCandidate({ ...cand, status: 'Selected' })
      } catch (err) {
        console.warn('Selection failed:', err.message)
      }
    } else if (newStatus === 'Pipeline') {
      try {
        const jobId = selectedPositionForCandidates?.id || null;
        await candidateApi.bulkApply({ candidates: [cand], jobId, jobTitle: selectedPositionForCandidates?.title });
        fetchCandidates() // Refresh pipeline
      } catch (err) {
        console.warn('Background save failed (Add to Pipeline):', err.message);
      }
    }
  }

  const handleSavePosition = (form) => {
    if (editingPositionForModal) {
      setPositionsList(positionsList.map(p => p.id === editingPositionForModal.id ? { ...p, ...form } : p))
    } else {
      setPositionsList([...positionsList, { id: Date.now(), ...form }])
    }
    setShowOpenPositionModal(false)
    setEditingPositionForModal(null)
  }

  const handleDeletePosition = (id) => {
    const pos = positionsList.find(p => p.id === id)
    setPositionToDelete(pos)
  }

  const handleStatusChange = (id, newStatus) => {
    setPositionsList(positionsList.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  // KPI State
  const [activeKpi, setActiveKpi] = useState('positions')
  const [activeCandidateKpi, setActiveCandidateKpi] = useState('all')

  // Dynamic Candidate Stats
  const positionCandidates = candidatesData.filter(c => 
    !selectedPositionForCandidates || c.role === selectedPositionForCandidates.title
  )
  const isInterviewCandidate = (candidate) => {
    const activeStatuses = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral']
    return activeStatuses.includes(candidate.status)
      && !['Screening', 'Applied', 'AI Match'].includes(candidate.stage)
      && !!candidate.stage
  }
  const isAppliedCandidate = (candidate) => {
    const activeStatuses = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral']
    return activeStatuses.includes(candidate.status)
      && (candidate.stage === 'Screening' || candidate.stage === 'Applied' || candidate.stage === 'AI Match' || !candidate.stage)
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
    const isPipelineStatus = ['ACTIVE', 'ON_HOLD', 'Pipeline', 'Referral'].includes(candidate.status)
    const isApplied = isPipelineStatus && (candidate.stage === 'Screening' || candidate.stage === 'Applied' || candidate.stage === 'AI Match' || !candidate.stage)
    const isInterviewing = isPipelineStatus && !isApplied
    const offer = getCandidateOffer(candidate)

    if (candidate.status === 'Rejected') {
      return (
        <button onClick={() => handleCandidateStatusChange(candidate, 'Pipeline')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          Restore
        </button>
      )
    }

    if (candidate.status === 'Selected') {
      if (!offer || !offer.offerStatus || offer.offerStatus === 'Draft') {
        return (
          <button onClick={() => setSelectedOfferCandidate(candidate)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-700">
            Create Offer
          </button>
        )
      }
      if (offer.offerStatus === 'Sent') {
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => rejectOffer(candidate)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100">
              Declined
            </button>
            <button onClick={() => acceptOffer(candidate)} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600">
              Accepted
            </button>
          </div>
        )
      }
      if (offer.offerStatus === 'Accepted') {
        return <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Ready for onboarding</span>
      }
      return <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">Offer declined</span>
    }

    if (isApplied) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => handleCandidateStatusChange(candidate, 'Rejected')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100">
            Reject
          </button>
          <button onClick={() => updateCandidateStage(candidate.id, 'Technical Round')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
            Select for interview
          </button>
        </div>
      )
    }

    if (isInterviewing) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setSchedulingCandidate(candidate)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100">
            Schedule
          </button>
          <button onClick={() => handleCandidateStatusChange(candidate, 'Rejected')} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100">
            Reject
          </button>
          <button onClick={() => handleCandidateStatusChange(candidate, 'Selected')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700">
            Select & Offer
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
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
    : 'grid grid-cols-1 gap-6'

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-500" /> Recruitment
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage job openings and candidate pipeline</p>
        </div>
        <div className="flex items-center gap-3">
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
          {/* KPI Boxes */}
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {[
              { id: 'positions', label: 'Open Positions', value: positionsList.filter(p => p.status !== 'Closed').length.toString(), icon: Briefcase, colorClass: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' },
              { id: 'closed', label: 'Closed Positions', value: positionsList.filter(p => p.status === 'Closed').length.toString(), icon: Briefcase, colorClass: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30' },
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
                  {positionsList.filter(p => activeKpi === 'positions' ? p.status !== 'Closed' : p.status === 'Closed').map(pos => (
                    <tr 
                      key={pos.id} 
                      onClick={(e) => {
                        if (e.target.closest('button')) return;
                        setSelectedPositionForCandidates(pos);
                        setActiveTab('candidates');
                      }}
                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors group cursor-pointer"
                    >
                      
                      {/* Column 1: ID, Title, Job Type */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs border border-slate-200 dark:border-slate-700">
                            #{pos.id.toString().padStart(3, '0')}
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
                                <button onClick={() => handleStatusChange(pos.id, 'Active')} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Mark as Active"><PlayCircle className="w-4 h-4" /></button>
                              )}
                              {pos.status !== 'On Hold' && pos.status !== 'Closed' && (
                                <button onClick={() => handleStatusChange(pos.id, 'On Hold')} className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors" title="Put On Hold"><PauseCircle className="w-4 h-4" /></button>
                              )}
                              {pos.status !== 'Closed' && (
                                <button onClick={() => handleStatusChange(pos.id, 'Closed')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-500/10 rounded-lg transition-colors" title="Close Position"><PowerOff className="w-4 h-4" /></button>
                              )}
                              <button onClick={() => setPublishingPosition(pos)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="Publish Job"><Globe className="w-4 h-4" /></button>
                              <button onClick={() => { setEditingPositionForModal(pos); setShowOpenPositionModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" title="Edit Position"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeletePosition(pos.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Position"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                          <button 
                            onClick={() => setSelectedPosition(pos)} 
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ml-2"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {positionsList.filter(p => activeKpi === 'positions' ? p.status !== 'Closed' : p.status === 'Closed').length === 0 && (
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
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">Showing candidate pipeline specifically for this role.</p>
              </div>
              <div className="flex items-center gap-3">
                {candidatePhase !== 'upload' && (
                  <button 
                    onClick={() => setCandidatePhase('upload')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
                  >
                    <UploadCloud className="w-4 h-4" /> Upload Candidate Data
                  </button>
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
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {[
                  { id: 'applied', label: 'Applied Candidates', value: candidateStats.applied.toString(), icon: Users, colorClass: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' },
                  { id: 'interviewing', label: 'Interview Candidates', value: candidateStats.interviewing.toString(), icon: Calendar, colorClass: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' },
                  { id: 'selected', label: 'Selected Candidates', value: candidateStats.selected.toString(), icon: CheckCircle2, colorClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30' },
                  { id: 'rejected', label: 'Rejected Candidates', value: candidateStats.rejected.toString(), icon: Trash2, colorClass: 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/30' },
                  { id: 'referral', label: 'Referral Candidates', value: candidateStats.referral.toString(), icon: UserPlus, colorClass: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30' },
                ].map(kpi => {
                  const Icon = kpi.icon
                  const isActive = activeCandidateKpi === kpi.id

                  return (
                    <div 
                      key={kpi.id}
                      onClick={() => setActiveCandidateKpi(isActive ? 'all' : kpi.id)}
                      className={`cursor-pointer rounded-2xl p-4 border shadow-sm flex items-center gap-4 transition-all duration-300 group ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 border-indigo-400 shadow-lg ring-2 ring-indigo-400/20 transform scale-[1.02]' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1'
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

              {/* Kanban Pipeline Board */}
              <div className="bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeCandidateKpi === 'all' && 'Candidate Pipeline Board'}
                    {activeCandidateKpi === 'applied' && 'Applied Candidates'}
                    {activeCandidateKpi === 'interviewing' && 'Interview Candidates Pipeline'}
                    {activeCandidateKpi === 'selected' && 'Selected Candidates Pipeline'}
                    {activeCandidateKpi === 'rejected' && 'Rejected Candidates Pipeline'}
                    {activeCandidateKpi === 'referral' && 'Referrals Pipeline'}
                  </h2>
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

                {activeCandidateKpi !== 'all' ? (
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
                                    <Sparkles className="h-3 w-3" /> {candidate.score || 0}%
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
                  {/* Applied / Screening Column */}
                  {shouldShowCandidateSection('applied') && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-[500px]">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div> Applied
                      </h3>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                        {candidatesData.filter(c => {
                          if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                          if (activeCandidateKpi !== 'all') {
                            if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                            if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                            if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                            if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                            if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                          }
                          return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && (c.stage === 'Screening' || c.stage === 'Applied' || !c.stage);
                        }).length}
                      </span>
                    </div>
                    <div className="space-y-4 flex-1">
                      {candidatesData.filter(c => {
                        if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                        if (activeCandidateKpi !== 'all') {
                          if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                          if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                          if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                          if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                          if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                        }
                        return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && (c.stage === 'Screening' || c.stage === 'Applied' || c.stage === 'AI Match' || !c.stage);
                      }).map(cand => renderCandidateCard(cand))}
                    </div>
                  </div>
                  )}

                  {/* Interviewing Column */}
                  {shouldShowCandidateSection('interviewing') && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl p-4 border border-indigo-100 dark:border-indigo-900/30 flex flex-col h-full min-h-[500px]">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div> Interviewing
                      </h3>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-slate-700">
                        {candidatesData.filter(c => {
                          if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                          if (activeCandidateKpi !== 'all') {
                            if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                            if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                            if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                            if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                            if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                          }
                          return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && c.stage !== 'Screening' && c.stage !== 'Applied' && c.stage !== 'AI Match' && !!c.stage;
                        }).length}
                      </span>
                    </div>
                    <div className="space-y-4 flex-1">
                      {candidatesData.filter(c => {
                        if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                        if (activeCandidateKpi !== 'all') {
                          if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                          if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                          if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                          if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                          if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                        }
                        return (c.status === 'ACTIVE' || c.status === 'ON_HOLD' || c.status === 'Pipeline' || c.status === 'Referral') && c.stage !== 'Screening' && c.stage !== 'Applied' && c.stage !== 'AI Match' && !!c.stage;
                      }).map(cand => renderCandidateCard(cand))}
                    </div>
                  </div>
                  )}

                  {/* Selected Column */}
                  {shouldShowCandidateSection('selected') && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex flex-col h-full min-h-[500px]">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Selected
                      </h3>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-100 dark:border-slate-700">
                        {candidatesData.filter(c => {
                          if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                          if (activeCandidateKpi !== 'all') {
                            if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                            if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                            if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                            if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                            if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                          }
                          return c.status === 'Selected';
                        }).length}
                      </span>
                    </div>
                    <div className="space-y-4 flex-1">
                      {candidatesData.filter(c => {
                        if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                        if (activeCandidateKpi !== 'all') {
                          if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                          if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                          if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                          if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                          if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                        }
                        return c.status === 'Selected';
                      }).map(cand => renderCandidateCard(cand))}
                    </div>
                  </div>
                  )}

                  {/* Rejected Column */}
                  {shouldShowCandidateSection('rejected') && (
                  <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-3xl p-4 border border-rose-100 dark:border-rose-900/30 flex flex-col h-full min-h-[500px]">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div> Rejected
                      </h3>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-rose-700 dark:text-rose-300 shadow-sm border border-rose-100 dark:border-slate-700">
                        {candidatesData.filter(c => {
                          if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                          if (activeCandidateKpi !== 'all') {
                            if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                            if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                            if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                            if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                            if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                          }
                          return c.status === 'Rejected';
                        }).length}
                      </span>
                    </div>
                    <div className="space-y-4 flex-1">
                      {candidatesData.filter(c => {
                        if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false;
                        if (activeCandidateKpi !== 'all') {
                          if (activeCandidateKpi === 'applied' && !isAppliedCandidate(c)) return false;
                          if (activeCandidateKpi === 'interviewing' && !isInterviewCandidate(c)) return false;
                          if (activeCandidateKpi === 'selected' && c.status !== 'Selected') return false;
                          if (activeCandidateKpi === 'rejected' && c.status !== 'Rejected') return false;
                          if (activeCandidateKpi === 'referral' && c.status !== 'Referral') return false;
                        }
                        return c.status === 'Rejected';
                      }).map(cand => renderCandidateCard(cand))}
                    </div>
                  </div>
                  )}

                  {/* Referral Column */}
                  {shouldShowCandidateSection('referral') && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl p-4 border border-indigo-100 dark:border-indigo-900/30 flex flex-col h-full min-h-[500px]">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Referrals
                        </h3>
                        <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-slate-700">
                          {candidatesData.filter(c => {
                            if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false
                            return c.status === 'Referral'
                          }).length}
                        </span>
                      </div>
                      <div className="space-y-4 flex-1">
                        {candidatesData.filter(c => {
                          if (selectedPositionForCandidates && c.role !== selectedPositionForCandidates.title) return false
                          return c.status === 'Referral'
                        }).map(cand => renderCandidateCard(cand))}
                      </div>
                    </div>
                  )}
                </div>
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Import Candidate Data</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-3">Select Data Source</label>
                    <div className="space-y-3">
                      {[
                        { id: 'linkedin', name: 'LinkedIn', color: 'bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/30' },
                        { id: 'naukri', name: 'Naukri.com', color: 'bg-[#0033cc]/10 text-[#0033cc] border-[#0033cc]/30' },
                        { id: 'indeed', name: 'Indeed', color: 'bg-[#003a9b]/10 text-[#003a9b] border-[#003a9b]/30' },
                        { id: 'other', name: 'Other CSV/Excel', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' }
                      ].map(src => (
                        <label 
                          key={src.id} 
                          className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            uploadSource === src.id 
                              ? `${src.color} border-current shadow-sm ring-1 ring-current` 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <input type="radio" className="hidden" checked={uploadSource === src.id} onChange={() => setUploadSource(src.id)} />
                          <span className="font-bold text-sm ml-2">{src.name}</span>
                          {uploadSource === src.id && <div className="ml-auto w-2 h-2 rounded-full bg-current"></div>}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col">
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
                      const file = e.dataTransfer.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => {
                      if(e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0])
                        e.target.value = '' // reset so same file can be re-uploaded
                      }
                    }} />
                    <input type="file" ref={resumeInputRef} className="hidden" accept=".pdf,.docx,.doc" onChange={(e) => {
                      if(e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0])
                        e.target.value = ''
                      }
                    }} />
                    
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6">
                      <UploadCloud className="w-10 h-10 text-indigo-500" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Drag and drop your file here</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-8">
                      Upload bulk candidate data from {uploadSource === 'linkedin' ? 'LinkedIn' : uploadSource === 'naukri' ? 'Naukri.com' : uploadSource === 'indeed' ? 'Indeed' : 'CSV/Excel'} or upload a single Resume to run AI analysis.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mt-6">
                      <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                        <UploadCloud className="w-4 h-4" /> Upload Candidate Data
                      </button>

                      <button onClick={() => resumeInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4" /> Upload Resume
                      </button>
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
                        <p className="text-sm mt-0.5 max-w-lg text-indigo-600 dark:text-indigo-300 font-medium">Upload a resume (PDF/DOCX) to automatically extract candidate details, skills, and experience. Or upload a CSV for bulk import.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {candidatePhase === 'processing' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {uploadFileName?.match(/\.(pdf|docx|doc)$/i) ? 'Parsing Resume...' : 'Processing Candidate Data...'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                {uploadFileName?.match(/\.(pdf|docx|doc)$/i) 
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
                    <Sparkles className="w-5 h-5 text-indigo-500" /> {parsedCandidates[0]?.source === 'RESUME' ? 'Parsed Resume Results' : 'Imported Candidates'}
                  </h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {parsedCandidates.length} candidate{parsedCandidates.length !== 1 ? 's' : ''} found from {uploadFileName || 'uploaded file'}
                    {selectedPositionForCandidates ? ` for "${selectedPositionForCandidates.title}"` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleAddAllToPipeline} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Add All
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
                      <th className="px-6 py-4">Candidate</th>
                      <th className="px-6 py-4">Experience</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {parsedCandidates.map((cand, i) => {
                      const localStatus = localCandidateStatuses[cand.email || cand.id];
                      return (
                      <tr key={cand.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{cand.name}</div>
                          <div className="text-xs text-slate-500">{cand.email}</div>
                          {cand.phone && <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> {cand.phone}</div>}
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
                        <td className="px-6 py-4 text-right">
                          {localStatus === 'Pipeline' ? (
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-xl">
                              <Users className="w-4 h-4" /> In Pipeline
                            </span>
                          ) : localStatus === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-xl">
                              <Trash2 className="w-4 h-4" /> Skipped
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleCandidateStatusChange(cand, 'Rejected')}
                                className="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors"
                              >
                                Skip
                              </button>
                              <button 
                                onClick={() => handleCandidateStatusChange(cand, 'Pipeline')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors"
                              >
                                Add to Pipeline
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

      <PositionDetailsModal 
        position={selectedPosition} 
        onClose={() => setSelectedPosition(null)} 
      />
      
      <SendOfferModal 
        candidate={selectedOfferCandidate} 
        onClose={() => setSelectedOfferCandidate(null)}
        onSend={async (candidate) => {
          await sendOffer(candidate)
          setSelectedOfferCandidate(null)
        }}
      />
      
      {showOpenPositionModal && (
        <OpenPositionModal 
          initialData={editingPositionForModal}
          onSave={handleSavePosition}
          onClose={() => {
            setShowOpenPositionModal(false)
            setEditingPositionForModal(null)
          }} 
        />
      )}
      
      <ConfirmDialog
        open={!!positionToDelete}
        title="Delete Position"
        description={`Are you sure you want to delete the position "${positionToDelete?.title}"? This action cannot be undone.`}
        requireReason={false}
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setPositionToDelete(null)}
        onConfirm={() => {
          setPositionsList(positionsList.filter(p => p.id !== positionToDelete.id))
          setPositionToDelete(null)
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 relative">
            
            {schedulingStep === 'success' && scheduleSuccess ? (
              <div className="py-8 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <Mail className="w-10 h-10 text-emerald-600 dark:text-emerald-400 absolute opacity-0 animate-[ping_1s_ease-out_forwards]" />
                  <Send className="w-8 h-8 text-emerald-600 dark:text-emerald-400 relative z-10 translate-x-0.5 -translate-y-0.5" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-sm">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Email Sent!</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-[280px] mx-auto">
                  <strong className="text-slate-700 dark:text-slate-300">{scheduleSuccess.name}</strong> has been notified about their upcoming <strong className="text-slate-700 dark:text-slate-300">{scheduleSuccess.type}</strong>.
                </p>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 text-left border border-indigo-100 dark:border-indigo-800 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl"></div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                    <Mail className="w-4 h-4" /> Message Sent
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {scheduleSuccess.body}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setScheduleSuccess(null)
                    setSchedulingCandidate(null)
                    setSchedulingStep('details')
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
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Review and edit the invitation email before sending it to <strong className="text-slate-900 dark:text-white">{schedulingCandidate.name}</strong>.
                </p>

                <textarea 
                  className="w-full h-64 p-4 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white mb-4 resize-none" 
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                />

                <div className="flex gap-3">
                  <button type="button" onClick={() => setSchedulingStep('details')} className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                    Back
                  </button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      const interviewType = schedulingFormData.type.includes('Technical') ? 'TECHNICAL'
                        : schedulingFormData.type.includes('Final') ? 'FINAL'
                        : schedulingFormData.type.includes('HR') ? 'MANAGERIAL'
                        : 'SCREENING'
                      try {
                        await scheduleInterview(schedulingCandidate, {
                          roundName: schedulingFormData.type,
                          type: interviewType,
                          date: schedulingFormData.rawDate,
                          startTime: schedulingFormData.rawTime,
                          mode: schedulingFormData.link ? 'ONLINE' : 'ONLINE',
                          meetingUrl: schedulingFormData.link,
                          candidateInstructions: emailDraft,
                        })
                      } catch (err) {
                        console.warn('Interview schedule failed:', err.message)
                        return
                      }
                      setScheduleSuccess({
                        name: schedulingCandidate.name,
                        email: schedulingCandidate.email || `${schedulingCandidate.name.toLowerCase().replace(' ', '.')}@example.com`,
                        date: schedulingFormData.date,
                        time: schedulingFormData.time,
                        type: schedulingFormData.type,
                        body: emailDraft
                      });
                      setSchedulingStep('success');
                    }} 
                    className="flex-[2] bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send Official Invite
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
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  You are scheduling an interview for <strong className="text-slate-900 dark:text-white">{schedulingCandidate.name}</strong> for the role of <strong className="text-slate-900 dark:text-white">{schedulingCandidate.role}</strong>. An invite will be sent to their email.
                </p>

                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const dateVal = formData.get('date');
                  const timeVal = formData.get('time');
                  const type = formData.get('type');
                  const link = formData.get('link');
                  
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

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => { setScheduleSuccess(null); setSchedulingCandidate(null); }} className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
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
                    <Sparkles className="w-3.5 h-3.5" /> {selectedCandidateInfo.score}% Match
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
