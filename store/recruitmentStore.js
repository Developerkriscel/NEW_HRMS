import { create } from 'zustand'
import { candidateApi } from '@/services/candidateApi'
import { offerApi } from '@/services/offerApi'
import { interviewApi } from '@/services/interviewApi'
import { selectionApi } from '@/services/selectionApi'

const CANDIDATE_PAGE_SIZE = 50
const RECRUITMENT_CACHE_TTL_MS = Number(process.env.NEXT_PUBLIC_RECRUITMENT_CACHE_TTL_MS || 60000)

function displayStatus(application, offer) {
  if (application.status === 'REJECTED' || application.status === 'WITHDRAWN') return 'Rejected'
  if (application.status === 'HIRED') return 'HIRED'

  const stageName = String(application.stage || application.currentStageName || '').toLowerCase()
  const isEarlyStage = stageName.includes('applied') || stageName.includes('screen') || stageName.includes('shortlist') || stageName.includes('interview') || stageName.includes('round') || stageName.includes('assessment')
  if (isEarlyStage) {
    return 'Pipeline'
  }

  const offerStatus = offer?.status || offer?.offerStatus
  if (offerStatus && offerStatus !== 'DRAFT') return 'Offered'
  if (application.selectionStatus === 'SELECTED' || application.selectionStatus === 'SELECTION_APPROVAL_PENDING' || application.selectionStatus === 'SELECTION_APPROVED') return 'Selected'
  return application.status
}

function pickStage(stages, preferredName, preferredCategory) {
  const active = (stages || []).filter((stage) => stage.isActive !== false)
  if (!active.length) return null
  const wanted = String(preferredName || '').toLowerCase()
  return active.find((stage) => String(stage.name || '').toLowerCase() === wanted)
    || active.find((stage) => wanted && String(stage.name || '').toLowerCase().includes(wanted))
    || active.find((stage) => preferredCategory && stage.category === preferredCategory)
    || active[0]
}

function addOneHour(time) {
  const [hours, minutes] = String(time || '10:00').split(':').map(Number)
  const nextHour = Number.isFinite(hours) ? (hours + 1) % 24 : 11
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0
  return `${String(nextHour).padStart(2, '0')}:${String(safeMinutes).padStart(2, '0')}`
}

function displayOfferStatus(status) {
  if (!status) return null
  if (status === 'SENT' || status === 'VIEWED') return 'Sent'
  if (status === 'ACCEPTED') return 'Accepted'
  if (status === 'DECLINED' || status === 'WITHDRAWN' || status === 'EXPIRED') return 'Rejected'
  if (status === 'DRAFT') return 'Draft'
  return status
}

function combineInterviewDateTime(interview) {
  if (!interview?.date) return null
  const datePart = new Date(interview.date).toISOString().slice(0, 10)
  const timePart = interview.startTime || '00:00'
  return `${datePart}T${timePart}:00`
}

function patchCandidateInState(state, candidateId, patch) {
  const patchValue = typeof patch === 'function' ? patch : () => patch
  const candidates = state.candidates.map((candidate) => (
    candidate.id === candidateId ? { ...candidate, ...patchValue(candidate) } : candidate
  ))
  return {
    candidates,
    offers: candidates.filter((candidate) => ['Selected', 'Offered', 'HIRED'].includes(candidate.status)),
    rejected: candidates.filter((candidate) => candidate.status === 'Rejected'),
  }
}

export const useRecruitmentStore = create((set, get) => ({
  candidates: [],
  offers: [],
  rejected: [],
  loading: false,
  loadingMore: false,
  error: null,
  candidatePage: 0,
  candidateTotal: 0,
  hasMoreCandidates: false,
  lastFetchedAt: 0,

  fetchCandidates: async (params = {}) => {
    const append = !!params.append
    const page = Number(params.page ?? (append ? get().candidatePage + 1 : 0))
    const size = Number(params.size || CANDIDATE_PAGE_SIZE)
    const current = get()
    if (
      !append
      && !params.force
      && current.candidates.length
      && current.lastFetchedAt
      && Date.now() - current.lastFetchedAt < RECRUITMENT_CACHE_TTL_MS
    ) {
      return current.candidates
    }
    set({ [append ? 'loadingMore' : 'loading']: true, error: null });
    try {
      // Load raw applications from backend
      const { append: _append, force: _force, ...requestParams } = params
      const res = await candidateApi.list({ ...requestParams, page, size }, { skipCache: !!params.force, devMock: false });
      const data = res.data.data || {}
      const rows = data.content || [];
      
      // Transform backend shape (application) into the UI candidate card shape
      const mappedCandidates = rows.map(a => ({
        id: a.applicationId,
        candidateId: a.candidateId,
        jobId: a.jobId,
        name: a.candidateName,
        email: a.email,
        phone: a.phone,
        role: a.jobTitle,
        stage: a.stage || 'Applied',
        score: a.aiMatchScore || 0,
        status: displayStatus(a, { status: a.offerStatus }),
        backendStatus: a.status,
        selectionStatus: a.selectionStatus,
        readyForOffer: a.readyForOffer,
        offerId: a.offerId,
        offerStatus: displayOfferStatus(a.offerStatus),
        backendOfferStatus: a.offerStatus,
        offerSentAt: a.offerSentAt,
        offerAcceptedAt: a.offerAcceptedAt,
        offerDeclinedAt: a.offerDeclinedAt,
        offerExpiresAt: a.offerExpiresAt,
        latestInterview: a.latestInterview,
        appliedAt: a.appliedAt,
        stageEnteredAt: a.stageEnteredAt,
        shortlistedAt: a.shortlistedAt,
        interviewAt: combineInterviewDateTime(a.latestInterview),
        interviewTime: a.latestInterview?.startTime || null,
        interviewEndTime: a.latestInterview?.endTime || null,
        interviewRoundName: a.latestInterview?.roundName || null,
        interviewMode: a.latestInterview?.mode || null,
        interviewStatus: a.latestInterview?.status || null,
        selectedAt: a.selectionStatus === 'SELECTED' ? (a.decision?.decidedAt || a.stageEnteredAt) : null,
      }));

      const nextCandidates = append
        ? [...get().candidates.filter((candidate) => !mappedCandidates.some((item) => item.id === candidate.id)), ...mappedCandidates]
        : mappedCandidates

      set({
        candidates: nextCandidates,
        offers: nextCandidates.filter(c => ['Selected', 'Offered', 'HIRED'].includes(c.status)),
        rejected: nextCandidates.filter(c => c.status === 'Rejected'),
        loading: false,
        loadingMore: false,
        candidatePage: page,
        candidateTotal: data.totalElements || nextCandidates.length,
        hasMoreCandidates: nextCandidates.length < (data.totalElements || nextCandidates.length),
        lastFetchedAt: Date.now(),
      });
    } catch (e) {
      console.error(e);
      set({ error: 'Failed to fetch candidates', loading: false, loadingMore: false });
    }
  },

  loadMoreCandidates: async () => get().fetchCandidates({ append: true }),

  shortlistCandidate: async (candidateObj) => {
    const previous = get().candidates.find((candidate) => candidate.id === candidateObj.id)
    set((state) => patchCandidateInState(state, candidateObj.id, {
      status: 'ACTIVE',
      backendStatus: 'ACTIVE',
      stage: 'Shortlisted',
      stageEnteredAt: new Date().toISOString(),
      shortlistedAt: new Date().toISOString(),
    }))
    try {
      const res = await candidateApi.shortlist(candidateObj.id, 'Shortlisted from recruitment board')
      const result = res.data?.data || {}
      set((state) => patchCandidateInState(state, candidateObj.id, {
        status: displayStatus(result),
        backendStatus: result.status || 'ACTIVE',
        stage: result.currentStageName || 'Shortlisted',
        stageEnteredAt: result.stageEnteredAt || new Date().toISOString(),
        shortlistedAt: result.shortlistedAt || result.stageEnteredAt || new Date().toISOString(),
        selectionStatus: result.selectionStatus || null,
        readyForOffer: !!result.readyForOffer,
      }))
    } catch (e) {
      console.error(e)
      if (previous) set((state) => patchCandidateInState(state, candidateObj.id, previous))
      set({ error: e.response?.data?.message || 'Failed to shortlist candidate' })
      throw e
    }
  },

  updateCandidateStatus: async (candidateObj, newStatus) => {
    // In our backend, updating status (e.g. Reject) might be a specific API call.
    // For simplicity, if newStatus is 'Rejected', we can call candidateApi.reject
    try {
      if (newStatus === 'Rejected' || newStatus === 'REJECTED') {
         const previous = get().candidates.find((candidate) => candidate.id === candidateObj.id)
         set((state) => patchCandidateInState(state, candidateObj.id, { status: 'Rejected', backendStatus: 'REJECTED' }))
         try {
           await candidateApi.reject(candidateObj.id, { reason: 'Other', comment: 'General rejection' });
         } catch (e) {
           if (previous) set((state) => patchCandidateInState(state, candidateObj.id, previous))
           throw e
         }
      } else if (newStatus === 'Pipeline' || newStatus === 'ACTIVE') {
         const previous = get().candidates.find((candidate) => candidate.id === candidateObj.id)
         const restoreStage = candidateObj.stage || 'Applied'
         set((state) => patchCandidateInState(state, candidateObj.id, {
           status: 'ACTIVE',
           backendStatus: 'ACTIVE',
           stage: restoreStage,
           selectionStatus: null,
           readyForOffer: false,
         }))
         try {
           const res = await candidateApi.restore(candidateObj.id, {
             stageName: restoreStage,
             comment: 'Restored from recruitment board',
           })
           const result = res.data?.data || {}
           set((state) => patchCandidateInState(state, candidateObj.id, {
             status: 'ACTIVE',
             backendStatus: result.application?.status || 'ACTIVE',
             stage: result.stage?.name || result.application?.currentStageName || restoreStage,
             selectionStatus: result.application?.selectionStatus || null,
             readyForOffer: !!result.application?.readyForOffer,
           }))
         } catch (e) {
           if (previous) set((state) => patchCandidateInState(state, candidateObj.id, previous))
           throw e
         }
      } else if (newStatus === 'Selected' || newStatus === 'HIRED') {
         // Placeholder for selecting/hiring
         // Usually you'd create an offer.
      }
    } catch (e) {
      console.error(e);
      set({ error: e.response?.data?.message || e.message || 'Failed to update candidate status' })
      throw e
    }
  },

  selectCandidate: async (candidateObj, data = {}) => {
    const previous = get().candidates.find((candidate) => candidate.id === candidateObj.id)
    set((state) => patchCandidateInState(state, candidateObj.id, {
      status: 'Selected',
      selectionStatus: 'SELECTED',
      stage: 'Selected',
      selectedAt: new Date().toISOString(),
      readyForOffer: true,
    }))
    try {
      const proposedJoiningDate = data.proposedJoiningDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const res = await selectionApi.select(candidateObj.id, {
        proposedJoiningDate,
        employmentType: data.employmentType || null,
        comments: data.comments || 'Selected from recruitment board',
        moveToSelectedStage: true,
      })
      const result = res.data?.data || {}
      set((state) => patchCandidateInState(state, candidateObj.id, {
        status: 'Selected',
        selectionStatus: result.application?.selectionStatus || 'SELECTED',
        stage: result.stage?.name || 'Selected',
        readyForOffer: true,
        selectedAt: result.decision?.decidedAt || new Date().toISOString(),
      }))
    } catch (e) {
      console.error(e)
      if (previous) set((state) => patchCandidateInState(state, candidateObj.id, previous))
      set({ error: e.response?.data?.message || 'Failed to select candidate' })
      throw e
    }
  },

  scheduleInterview: async (candidateObj, data) => {
    try {
      const endTime = data.endTime || addOneHour(data.startTime)
      const res = await interviewApi.create({
        applicationId: candidateObj.id,
        roundName: data.roundName || 'Interview',
        type: data.type || 'TECHNICAL',
        date: data.date,
        startTime: data.startTime,
        endTime,
        mode: data.mode || 'ONLINE',
        meetingProvider: data.meetingUrl ? 'CUSTOM_LINK' : null,
        meetingUrl: data.meetingUrl || null,
        location: data.location || null,
        sendCandidateEmail: data.sendCandidateEmail !== false,
        candidateEmailSubject: data.candidateEmailSubject || null,
        candidateEmailBody: data.candidateEmailBody || data.candidateInstructions || null,
        candidateInstructions: data.candidateInstructions || data.candidateEmailBody || null,
        candidateEmail: data.candidateEmail || candidateObj.email || null,
        interviewers: data.interviewers || [],
      })
      const createdData = res.data?.data || {}
      const interview = createdData.interview
      const newRoundName = data.roundName || 'Interview'
      set((state) => patchCandidateInState(state, candidateObj.id, {
        latestInterview: interview,
        interviewAt: `${data.date}T${data.startTime}:00`,
        interviewTime: data.startTime,
        interviewEndTime: endTime,
        interviewRoundName: newRoundName,
        interviewMode: data.mode || 'ONLINE',
        interviewStatus: 'SCHEDULED',
        stage: newRoundName,
        status: 'Pipeline',
        backendStatus: 'ACTIVE',
        email: data.candidateEmail || candidateObj.email,
      }))
      try {
        await get().fetchCandidates({ force: true, job: candidateObj.jobId })
      } catch (fErr) {
        console.warn('Re-fetch candidates after scheduling skipped:', fErr)
      }
      return createdData
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || 'Failed to schedule interview' })
      throw e
    }
  },

  sendOffer: async (candidate) => {
    const candidateId = candidate.id || candidate
    const previous = get().candidates.find((item) => item.id === candidateId)
    try {
      const payload = candidate?.offerEmail ? {
        subject: candidate.offerEmail.subject,
        body: candidate.offerEmail.body,
        candidateEmail: candidate.email || undefined,
      } : { candidateEmail: candidate?.email || undefined }
      let requestBody = payload
      const attachments = candidate?.offerEmail?.attachments || []
      if (attachments.length) {
        requestBody = new FormData()
        requestBody.append('subject', payload.subject || '')
        requestBody.append('body', payload.body || '')
        if (candidate?.email) {
          requestBody.append('candidateEmail', candidate.email)
        }
        attachments.forEach((file) => requestBody.append('attachments', file))
      }
      const res = await candidateApi.quickOffer(candidateId, requestBody)
      const result = res.data.data
      set((state) => patchCandidateInState(state, candidateId, {
        status: 'Offered',
        stage: result.stage?.name || result.application?.currentStageName || 'Offered',
        offerId: result.offer?._id || previous?.offerId,
        offerStatus: displayOfferStatus(result.offer?.status) || 'Sent',
        backendOfferStatus: result.offer?.status || 'SENT',
        offerSentAt: result.offer?.sentAt || new Date().toISOString(),
        offerExpiresAt: result.offer?.expiresAt || null,
      }))
      return result
    } catch (e) {
      console.error(e)
      if (previous) set((state) => patchCandidateInState(state, candidateId, previous))
      set({ error: e.response?.data?.message || 'Failed to send offer' })
      throw e
    }
  },
  
  acceptOffer: async (candidateOrId) => {
    try {
      const candidate = typeof candidateOrId === 'object'
        ? candidateOrId
        : get().offers.find((item) => item.id === candidateOrId) || get().candidates.find((item) => item.id === candidateOrId)
      if (!candidate?.offerId) throw new Error('No sent offer found for this candidate')
      
      const job = get().selectedPositionForCandidates;
      let hiredStageName = 'Hired';
      if (job?.pipelineStages?.length > 0) {
        const hiredStage = job.pipelineStages.find(s => s.category === 'HIRED' || s.name.toLowerCase() === 'hired');
        if (hiredStage) hiredStageName = hiredStage.name;
      }

      await offerApi.accept(candidate.offerId, {
        fullName: candidate.name,
        comment: 'Marked accepted from recruitment board',
      })
      set((state) => patchCandidateInState(state, candidate.id, {
        offerStatus: 'Accepted',
        backendOfferStatus: 'ACCEPTED',
        offerAcceptedAt: new Date().toISOString(),
        status: 'HIRED',
        stage: hiredStageName
      }))
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || e.message || 'Failed to accept offer' })
      throw e
    }
  },
  
  rejectOffer: async (candidateOrId) => {
    try {
      const candidate = typeof candidateOrId === 'object'
        ? candidateOrId
        : get().offers.find((item) => item.id === candidateOrId) || get().candidates.find((item) => item.id === candidateOrId)
      if (!candidate?.offerId) throw new Error('No sent offer found for this candidate')
      await offerApi.decline(candidate.offerId, {
        reason: 'Other',
        comment: 'Marked declined from recruitment board',
      })
      set((state) => patchCandidateInState(state, candidate.id, {
        offerStatus: 'Rejected',
        backendOfferStatus: 'DECLINED',
        offerDeclinedAt: new Date().toISOString(),
      }))
    } catch (e) {
      console.error(e)
      set({ error: e.response?.data?.message || e.message || 'Failed to decline offer' })
      throw e
    }
  },

  updateCandidateStage: async (candidateId, newStageName) => {
    const previous = get().candidates.find((candidate) => candidate.id === candidateId)
    const stageLower = String(newStageName || '').toLowerCase()
    const isEarlyStage = stageLower.includes('shortlist') || stageLower.includes('interview') || stageLower.includes('round') || stageLower.includes('applied') || stageLower.includes('screen') || stageLower.includes('assessment')
    const updatedStatus = isEarlyStage ? 'Pipeline' : (stageLower.includes('hired') ? 'HIRED' : (stageLower.includes('offer') ? 'Offered' : (stageLower.includes('select') ? 'Selected' : previous?.status)))

    set((state) => patchCandidateInState(state, candidateId, {
      stage: newStageName,
      status: updatedStatus,
      selectionStatus: isEarlyStage ? null : previous?.selectionStatus,
      readyForOffer: isEarlyStage ? false : previous?.readyForOffer,
    }))
    try {
      const preferredCategory = /shortlist/i.test(newStageName) ? 'SCREENING'
        : /offer/i.test(newStageName) ? 'OFFER'
        : /interview|technical|round/i.test(newStageName) ? 'INTERVIEW'
        : null
      const res = await candidateApi.moveStage(candidateId, {
        stageName: newStageName,
        preferredCategory,
        comment: `Moved to ${newStageName}`,
      })
      const stage = res.data?.data?.stage
      set((state) => patchCandidateInState(state, candidateId, {
        stage: stage?.name || newStageName,
        status: isEarlyStage ? 'Pipeline' : updatedStatus,
        backendStatus: res.data?.data?.application?.status || previous?.backendStatus,
        selectionStatus: isEarlyStage ? null : (res.data?.data?.application?.selectionStatus || previous?.selectionStatus),
        readyForOffer: isEarlyStage ? false : !!(res.data?.data?.application?.readyForOffer ?? previous?.readyForOffer),
      }))
    } catch (e) {
      console.error(e);
      if (previous) set((state) => patchCandidateInState(state, candidateId, previous))
      set({ error: e.response?.data?.message || e.message || 'Failed to move candidate stage' })
      throw e
    }
  }
}))
